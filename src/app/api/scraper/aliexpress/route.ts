import { NextRequest, NextResponse } from 'next/server'

const APIFY_API_KEY = process.env.APIFY_API_KEY!
// Actor oficial de AliExpress en Apify
const ACTOR_ID = 'apify~aliexpress-scraper'

export async function POST(req: NextRequest) {
  try {
    const { urls, searchQuery, maxItems = 20 } = await req.json()

    if (!urls && !searchQuery) {
      return NextResponse.json({ error: 'Se requiere urls o searchQuery' }, { status: 400 })
    }

    if (!APIFY_API_KEY) {
      return NextResponse.json({ error: 'APIFY_API_KEY no configurada' }, { status: 500 })
    }

    // Construir input para el actor de Apify
    const actorInput: Record<string, unknown> = {
      maxItems,
      currency: 'MXN',
      language: 'es',
    }

    if (urls && urls.length > 0) {
      // Scrapear URLs directas de productos o categorías
      actorInput.startUrls = urls.map((url: string) => ({ url }))
    } else if (searchQuery) {
      // Buscar por término
      actorInput.searchTerms = [searchQuery]
    }

    // 1. Iniciar el run del actor en Apify
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput),
      }
    )

    if (!runResponse.ok) {
      const err = await runResponse.text()
      console.error('Apify run error:', err)
      return NextResponse.json({ error: 'Error iniciando scraper en Apify', detail: err }, { status: 500 })
    }

    const runData = await runResponse.json()
    const runId = runData.data?.id

    if (!runId) {
      return NextResponse.json({ error: 'No se obtuvo runId de Apify' }, { status: 500 })
    }

    // 2. Esperar a que el run termine (polling cada 3s, max 3 minutos)
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60

    while (status === 'RUNNING' || status === 'READY') {
      if (attempts >= maxAttempts) {
        return NextResponse.json({ error: 'Timeout: el scraper tardó demasiado' }, { status: 504 })
      }

      await new Promise(r => setTimeout(r, 3000))
      attempts++

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      )
      const statusData = await statusResponse.json()
      status = statusData.data?.status
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ error: `El scraper terminó con estado: ${status}` }, { status: 500 })
    }

    // 3. Obtener los resultados del dataset
    const datasetId = runData.data?.defaultDatasetId
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&format=json`
    )

    if (!resultsResponse.ok) {
      return NextResponse.json({ error: 'Error obteniendo resultados de Apify' }, { status: 500 })
    }

    const rawProducts = await resultsResponse.json()

    // 4. Normalizar los datos crudos de Apify al formato de nuestro schema
    const normalizedProducts = rawProducts.map((item: Record<string, unknown>) => normalizeApifyProduct(item))

    return NextResponse.json({
      success: true,
      count: normalizedProducts.length,
      products: normalizedProducts,
    })

  } catch (error) {
    console.error('Error en scraper:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Normaliza los campos del actor de Apify a nuestro schema de Supabase
function normalizeApifyProduct(item: Record<string, unknown>) {
  // El actor de AliExpress puede devolver diferentes estructuras
  const price = parseFloat(
    String(
      (item.salePrice as Record<string, unknown>)?.minPrice ??
      item.salePrice ??
      item.price ??
      0
    )
  )

  const images: string[] = []
  if (Array.isArray(item.images)) {
    item.images.forEach((img: unknown) => {
      if (typeof img === 'string') images.push(img)
      else if (typeof img === 'object' && img !== null && 'url' in img) images.push((img as Record<string, unknown>).url as string)
    })
  } else if (typeof item.image === 'string') {
    images.push(item.image)
  }

  return {
    name: item.title ?? item.name ?? 'Sin nombre',
    description: item.description ?? item.productDescription ?? '',
    price: isNaN(price) ? 0 : price,
    cost_price: isNaN(price) ? 0 : price,
    stock: 100, // Stock por defecto para dropshipping
    category: item.categoryName ?? item.breadcrumb ?? 'General',
    images,
    source_url: item.url ?? item.productUrl ?? '',
    source_name: 'AliExpress',
    active: true,
    sold: 0,
  }
}
