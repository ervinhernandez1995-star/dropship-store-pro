import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function fixImg(url: string): string {
  if (!url) return ''
  return url.replace('http://', 'https://').replace(/-I\.jpg/, '-O.jpg').replace(/-S\.jpg/, '-O.jpg')
}

function detectCategory(catId: string): string {
  const map: Record<string, string> = {
    MLM1648: 'Electrónica', MLM1276: 'Electrónica', MLM1051: 'Electrónica',
    MLM1430: 'Hogar', MLM1574: 'Hogar', MLM1168: 'Deportes',
    MLM1182: 'Moda', MLM1185: 'Moda', MLM1246: 'Belleza',
    MLM1132: 'Automotriz', MLM1367: 'Juguetes',
  }
  return Object.entries(map).find(([k]) => catId.startsWith(k))?.[1] || 'General'
}

function extractKeywords(url: string): string {
  const qMatch = url.match(/[?&]q=([^&]+)/)
  if (qMatch) return decodeURIComponent(qMatch[1].replace(/\+/g, ' '))
  const listadoMatch = url.match(/listado\.mercadolibre\.com\.mx\/([^?#_]+)/)
  if (listadoMatch) return listadoMatch[1].replace(/-/g, ' ').trim()
  const wwwMatch = url.match(/mercadolibre\.com\.mx\/([^?#/]+)/)
  if (wwwMatch && !wwwMatch[1].startsWith('MLM')) return wwwMatch[1].replace(/-/g, ' ').trim()
  return ''
}

// Get ML access token using Client Credentials
async function getMLToken(): Promise<string> {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML Auth error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.access_token
}

async function mlSearch(query: string, limit: number, token: string) {
  const res = await fetch(
    `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(query)}&limit=${limit}&condition=new`,
    {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML Search error ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { url, limit = 20, margin = 20 } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'Escribe una URL' }, { status: 400 })

    const isMercadoLibre = url.includes('mercadolibre')
    const isAmazon = url.includes('amazon')
    const isAliExpress = url.includes('aliexpress')

    if (!isMercadoLibre && !isAmazon && !isAliExpress) {
      return NextResponse.json({ error: 'URL no reconocida. Usa MercadoLibre, Amazon o AliExpress.' }, { status: 400 })
    }

    if (isMercadoLibre && (url.includes('/p/MLM') || url.includes('polycard_client') || url.includes('tracking_id'))) {
      return NextResponse.json({ error: '⚠️ Esa es la URL de un producto individual. Para importar en masa necesitas la URL de una búsqueda. Ej: https://listado.mercadolibre.com.mx/bocinas-bluetooth' }, { status: 400 })
    }

    let searchQuery = ''
    let sourceName = ''

    if (isMercadoLibre) {
      sourceName = 'MercadoLibre'
      searchQuery = extractKeywords(url)
      if (!searchQuery || searchQuery.length < 3) {
        return NextResponse.json({ error: 'No se pudo extraer la búsqueda de la URL. Usa: https://listado.mercadolibre.com.mx/bocinas-bluetooth' }, { status: 400 })
      }
    } else if (isAmazon) {
      sourceName = 'Amazon'
      const kMatch = url.match(/[?&]k=([^&]+)/) || url.match(/field-keywords=([^&]+)/)
      searchQuery = kMatch ? decodeURIComponent(kMatch[1].replace(/\+/g, ' ')) : 'productos'
    } else {
      sourceName = 'AliExpress'
      const decoded = decodeURIComponent(url)
      const path = decoded.split('/').find((s: string) => s.length > 15 && s.includes('-'))
      searchQuery = path?.replace(/-/g, ' ').slice(0, 60) || 'productos'
    }

    // Get official ML token
    const token = await getMLToken()
    const mlData = await mlSearch(searchQuery, Math.min(limit, 48), token)
    const rawProducts = mlData.results || []

    if (rawProducts.length === 0) {
      return NextResponse.json({ error: `No se encontraron productos para "${searchQuery}".` }, { status: 400 })
    }

    // Check duplicates
    const { data: existing } = await supabaseAdmin.from('products').select('source_url').not('source_url', 'is', null)
    const existingUrls = new Set((existing || []).map((p: any) => p.source_url))

    const inserted: any[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const item of rawProducts) {
      if (existingUrls.has(item.permalink)) { skipped.push(item.title); continue }
      if (!item.price || item.price <= 0) { errors.push(`${item.title?.slice(0, 40)} — sin precio`); continue }

      const imgs = item.thumbnail ? [fixImg(item.thumbnail)] : []
      const suggestedPrice = Math.ceil(item.price * (1 + margin / 100))

      let description = `${item.title} — excelente calidad al mejor precio. ¡Envío rápido a toda la República!`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de producto atractiva en español. Máximo 60 palabras. Solo párrafo.' },
          { role: 'user', content: `Descripción para: "${item.title}". Precio: $${suggestedPrice} MXN.` },
        ])
      } catch { /* use default */ }

      const { data: product, error } = await supabaseAdmin.from('products').insert([{
        name: item.title,
        description,
        price: suggestedPrice,
        cost_price: item.price,
        stock: item.available_quantity || 10,
        category: detectCategory(item.category_id || ''),
        images: imgs,
        source_url: item.permalink,
        source_name: sourceName,
        active: true,
      }]).select().single()

      if (error) errors.push(`${item.title?.slice(0, 40)} — ${error.message}`)
      else inserted.push(product)

      await new Promise(r => setTimeout(r, 150))
    }

    return NextResponse.json({
      success: true,
      search_query: searchQuery,
      total_found: rawProducts.length,
      inserted: inserted.length,
      skipped: skipped.length,
      errors: errors.length,
      error_details: errors.slice(0, 5),
      products: inserted.slice(0, 10),
      source: sourceName,
    })

  } catch (e: any) {
    console.error('Bulk import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
