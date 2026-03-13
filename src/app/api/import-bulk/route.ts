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

// Extract search keywords from any ML URL
function extractKeywords(url: string): string {
  // ?q= param
  const qMatch = url.match(/[?&]q=([^&]+)/)
  if (qMatch) return decodeURIComponent(qMatch[1].replace(/\+/g, ' '))

  // listado.mercadolibre.com.mx/KEYWORDS
  const listadoMatch = url.match(/listado\.mercadolibre\.com\.mx\/([^?#_]+)/)
  if (listadoMatch) return listadoMatch[1].replace(/-/g, ' ').trim()

  // www.mercadolibre.com.mx/KEYWORDS
  const wwwMatch = url.match(/mercadolibre\.com\.mx\/([^?#/]+)/)
  if (wwwMatch && !wwwMatch[1].startsWith('MLM')) return wwwMatch[1].replace(/-/g, ' ').trim()

  return ''
}

async function mlSearch(query: string, limit: number) {
  const encodedQuery = encodeURIComponent(query)
  // Use the public ML search API with proper headers
  const res = await fetch(
    `https://api.mercadolibre.com/sites/MLM/search?q=${encodedQuery}&limit=${limit}&condition=new`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TodoClickMX/1.0',
      },
      // Use Next.js cache: no-store to avoid caching issues
      cache: 'no-store',
    }
  )
  
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`MercadoLibre API error ${res.status}: ${errText.slice(0, 200)}`)
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

    // Detect single product URL
    if (isMercadoLibre && (url.includes('/p/MLM') || url.includes('polycard_client') || url.includes('tracking_id'))) {
      return NextResponse.json({ error: '⚠️ Esa es la URL de un producto individual. Para importar en masa necesitas la URL de una búsqueda. Ejemplo: https://listado.mercadolibre.com.mx/bocinas-bluetooth' }, { status: 400 })
    }

    let rawProducts: any[] = []
    let sourceName = ''
    let searchQuery = ''

    if (isMercadoLibre) {
      sourceName = 'MercadoLibre'
      searchQuery = extractKeywords(url)
      if (!searchQuery || searchQuery.length < 3) {
        return NextResponse.json({ error: 'No se pudo extraer palabras clave de la URL. Intenta con: https://listado.mercadolibre.com.mx/bocinas-bluetooth' }, { status: 400 })
      }
    } else if (isAmazon) {
      sourceName = 'Amazon'
      const kMatch = url.match(/[?&]k=([^&]+)/) || url.match(/field-keywords=([^&]+)/)
      if (kMatch) searchQuery = decodeURIComponent(kMatch[1].replace(/\+/g, ' '))
      else {
        const path = url.split('/').find((s: string) => s.length > 10 && s.includes('-'))
        searchQuery = path?.replace(/-/g, ' ').slice(0, 50) || 'productos'
      }
    } else {
      sourceName = 'AliExpress'
      const decoded = decodeURIComponent(url)
      const path = decoded.split('/').find((s: string) => s.length > 15 && s.includes('-'))
      searchQuery = path?.replace(/-/g, ' ').slice(0, 60) || 'productos'
    }

    const mlData = await mlSearch(searchQuery, Math.min(limit, 48))
    rawProducts = mlData.results || []

    if (rawProducts.length === 0) {
      return NextResponse.json({ error: `No se encontraron productos para "${searchQuery}". Intenta con otra búsqueda.` }, { status: 400 })
    }

    // Check existing to avoid duplicates
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

      let description = `${item.title} — excelente calidad al mejor precio. ¡Envío rápido!`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe una descripción de producto atractiva en español. Máximo 60 palabras. Solo párrafo.' },
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
