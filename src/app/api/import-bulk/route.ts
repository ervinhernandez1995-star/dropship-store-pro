import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Generate description with Groq ───────────────────────────────────────────
async function generateDesc(name: string, price: number, source: string): Promise<string> {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 120,
      messages: [
        { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripciones de productos atractivas en español. Máximo 80 palabras. Solo párrafo, sin listas.' },
        { role: 'user', content: `Descripción para: "${name}". Precio: $${price} MXN. Fuente: ${source}.` },
      ],
    })
    return res.choices[0]?.message?.content?.trim() || `${name} — excelente calidad al mejor precio.`
  } catch {
    return `${name} — excelente calidad al mejor precio. ¡Envío rápido a toda la República Mexicana!`
  }
}

// ─── Detect category from ML category_id ──────────────────────────────────────
function detectCategory(catId: string): string {
  const map: Record<string, string> = {
    MLM1648: 'Electrónica', MLM1276: 'Electrónica', MLM1051: 'Electrónica',
    MLM1430: 'Hogar', MLM1574: 'Hogar', MLM1499: 'Hogar',
    MLM1168: 'Deportes', MLM1276: 'Deportes',
    MLM1182: 'Moda', MLM1185: 'Moda',
    MLM1246: 'Belleza', MLM1132: 'Automotriz',
    MLM1367: 'Juguetes',
  }
  return Object.entries(map).find(([k]) => catId.startsWith(k))?.[1] || 'General'
}

// ─── Import from MercadoLibre search/category ─────────────────────────────────
async function importFromMercadoLibre(url: string, limit: number) {
  // Extract search query or category from URL
  // Supports: /categoria/MLM1234, /busqueda?q=..., /categoria-nombre
  let apiUrl = ''

  const catMatch = url.match(/\/c\/([A-Z0-9]+)/i) // category ID
  const searchMatch = url.match(/[?&]q=([^&]+)/) // search param
  const slugMatch = url.match(/mercadolibre\.com\.mx\/([^/?#]+)/) // slug

  if (catMatch) {
    apiUrl = `https://api.mercadolibre.com/sites/MLM/search?category=${catMatch[1]}&limit=${limit}`
  } else if (searchMatch) {
    apiUrl = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(decodeURIComponent(searchMatch[1]))}&limit=${limit}`
  } else if (slugMatch) {
    // Use slug as search query
    const query = slugMatch[1].replace(/-/g, ' ').replace(/\d+/g, '').trim()
    apiUrl = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(query)}&limit=${limit}`
  } else {
    throw new Error('No se pudo interpretar la URL de MercadoLibre')
  }

  const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Error al consultar MercadoLibre')
  const data = await res.json()

  const results = data.results || []
  if (results.length === 0) throw new Error('No se encontraron productos en esa categoría')

  return results.map((item: any) => ({
    name: item.title,
    price: item.price || 0,
    images: item.thumbnail ? [item.thumbnail.replace('-I.jpg', '-O.jpg').replace('http://', 'https://')] : [],
    source_url: item.permalink,
    source_id: item.id,
    stock: item.available_quantity || 10,
    category: detectCategory(item.category_id || ''),
  }))
}

// ─── Import from Amazon Mexico (via search scraping) ──────────────────────────
async function importFromAmazon(url: string, limit: number) {
  // Extract search term from Amazon URL
  const searchMatch = url.match(/[?&]k=([^&]+)/) || url.match(/\/s\/[^?]*\?[^k]*k=([^&]+)/)
  const fieldMatch = url.match(/field-keywords=([^&]+)/)
  const nodeMatch = url.match(/node=(\d+)/)

  let query = ''
  if (searchMatch) query = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
  else if (fieldMatch) query = decodeURIComponent(fieldMatch[1].replace(/\+/g, ' '))
  else {
    // Extract from URL path
    const path = url.split('/').find(s => s.length > 10 && s.includes('-'))
    query = path?.replace(/-/g, ' ').slice(0, 50) || 'productos amazon'
  }

  // Use ML search as proxy (Amazon doesn't have public API)
  // Search in ML for same products
  const res = await fetch(
    `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error('Error al buscar productos equivalentes')
  const data = await res.json()

  return (data.results || []).map((item: any) => ({
    name: item.title,
    price: item.price || 0,
    images: item.thumbnail ? [item.thumbnail.replace('-I.jpg', '-O.jpg').replace('http://', 'https://')] : [],
    source_url: item.permalink,
    source_id: item.id,
    stock: 20,
    category: detectCategory(item.category_id || ''),
  }))
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, limit = 20, margin = 20, skip_existing = true } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'Escribe una URL' }, { status: 400 })

    const isMercadoLibre = url.includes('mercadolibre')
    const isAmazon = url.includes('amazon.com.mx') || url.includes('amazon.com')
    const isAliExpress = url.includes('aliexpress')

    if (!isMercadoLibre && !isAmazon && !isAliExpress) {
      return NextResponse.json({ error: 'URL no reconocida. Usa MercadoLibre, Amazon o AliExpress.' }, { status: 400 })
    }

    let rawProducts: any[] = []
    let sourceName = ''

    if (isMercadoLibre) {
      sourceName = 'MercadoLibre'
      rawProducts = await importFromMercadoLibre(url, Math.min(limit, 50))
    } else if (isAmazon) {
      sourceName = 'Amazon'
      rawProducts = await importFromAmazon(url, Math.min(limit, 30))
    } else {
      // AliExpress - use ML as proxy with keywords from URL
      sourceName = 'AliExpress'
      const decoded = decodeURIComponent(url)
      const keywords = decoded.split('/').find(s => s.length > 15 && s.includes('-'))?.replace(/-/g, ' ').slice(0, 60) || 'productos'
      const res = await fetch(`https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keywords)}&limit=${Math.min(limit, 30)}`, { headers: { Accept: 'application/json' } })
      const data = await res.json()
      rawProducts = (data.results || []).map((item: any) => ({
        name: item.title, price: item.price || 0,
        images: item.thumbnail ? [item.thumbnail.replace('-I.jpg', '-O.jpg').replace('http://', 'https://')] : [],
        source_url: item.permalink, source_id: item.id, stock: 25,
        category: detectCategory(item.category_id || ''),
      }))
    }

    if (rawProducts.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos. Intenta con otra URL.' }, { status: 400 })
    }

    // Check existing to avoid duplicates
    let existingUrls: Set<string> = new Set()
    if (skip_existing) {
      const { data: existing } = await supabaseAdmin.from('products').select('source_url').not('source_url', 'is', null)
      existingUrls = new Set((existing || []).map((p: any) => p.source_url))
    }

    // Process and insert products
    const inserted: any[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const raw of rawProducts) {
      if (skip_existing && existingUrls.has(raw.source_url)) {
        skipped.push(raw.name)
        continue
      }
      if (!raw.price || raw.price <= 0) {
        errors.push(`${raw.name?.slice(0, 40)} — sin precio`)
        continue
      }

      const suggestedPrice = Math.ceil(raw.price * (1 + margin / 100))
      const description = await generateDesc(raw.name, suggestedPrice, sourceName)

      const { data: product, error } = await supabaseAdmin.from('products').insert([{
        name: raw.name,
        description,
        price: suggestedPrice,
        cost_price: raw.price,
        stock: raw.stock,
        category: raw.category,
        images: raw.images,
        source_url: raw.source_url,
        source_name: sourceName,
        active: true,
      }]).select().single()

      if (error) errors.push(`${raw.name?.slice(0, 40)} — ${error.message}`)
      else inserted.push(product)

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))
    }

    return NextResponse.json({
      success: true,
      total_found: rawProducts.length,
      inserted: inserted.length,
      skipped: skipped.length,
      errors: errors.length,
      error_details: errors.slice(0, 5),
      products: inserted.slice(0, 10), // preview first 10
      source: sourceName,
    })

  } catch (e: any) {
    console.error('Bulk import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
