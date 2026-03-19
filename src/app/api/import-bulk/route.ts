import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function fixImg(url: string): string {
  if (!url) return ''
  return url.replace('http://', 'https://').replace(/-I\.jpg$/, '-O.jpg').replace(/-S\.jpg$/, '-O.jpg')
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text || '')
}

async function translateToSpanish(text: string): Promise<string> {
  if (!text || !hasChinese(text)) return text
  try {
    const result = await groqChat([
      { role: 'system', content: 'You are a translator. Translate the Chinese product title to natural Spanish for Mexico. Return ONLY the translated title, nothing else, no quotes.' },
      { role: 'user', content: text },
    ])
    return result.trim().replace(/^["']|["']$/g, '') || text
  } catch { return text }
}

function detectCategoryFromName(name: string): string {
  const n = name.toLowerCase()
  if (/auricular|headphone|bluetooth|smartwatch|reloj inteligente|bocina|speaker|cargador|cable usb|gaming|mouse|teclado|camara|led strip|earphone|earbuds|tws/.test(n)) return 'Electrónica'
  if (/camisa|pantalon|vestido|zapato|tenis|bolsa|mochila|ropa|sueter|hoodie|legging|bikini|falda|blusa|playera/.test(n)) return 'Moda'
  if (/cocina|lampara|silla|mesa|decoracion|cojin|cortina|hogar|alfombra|organizador|almohada|toalla/.test(n)) return 'Hogar'
  if (/gym|fitness|yoga|deporte|correr|ciclismo|pesas|banda elastica|colchoneta/.test(n)) return 'Deportes'
  if (/crema|maquillaje|perfume|serum|labial|mascara|base|bronceador|skincare/.test(n)) return 'Belleza'
  if (/juguete|niño|bebe|peluche|lego|puzzle|muñeca|carro de juguete/.test(n)) return 'Juguetes'
  if (/auto|carro|vehiculo|volante|soporte celular carro/.test(n)) return 'Automotriz'
  return 'General'
}

export async function POST(req: NextRequest) {
  try {
    const { products, margin = 20, sourceName = 'CJDropshipping', searchQuery = '' } = await req.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No se recibieron productos' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin.from('products').select('source_url').not('source_url', 'is', null)
    const existingUrls = new Set((existing || []).map((p: any) => p.source_url))

    const inserted: any[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const item of products) {
      if (existingUrls.has(item.permalink)) { skipped.push(item.title); continue }
      if (!item.price || item.price <= 0) { errors.push(`Sin precio: ${String(item.title || '').slice(0, 40)}`); continue }

      // Translate Chinese title if needed
      const rawTitle = item.titleEs || item.title || ''
      const cleanTitle = hasChinese(rawTitle) ? await translateToSpanish(rawTitle) : rawTitle
      if (!cleanTitle || cleanTitle.length < 3) { errors.push('Título vacío'); continue }

      const imgs = (item.images?.length > 0 ? item.images : [item.thumbnail]).filter(Boolean).map(fixImg)
      const suggestedPrice = Math.ceil(item.price * (1 + margin / 100))
      const category = item.category ? item.category : detectCategoryFromName(cleanTitle)

      // Generate Spanish description with Groq
      let description = `${cleanTitle} — producto de calidad con envío rápido a todo México.`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de venta atractiva en español. Máximo 70 palabras. Solo párrafo, sin listas.' },
          { role: 'user', content: `Descripción para: "${cleanTitle}". Precio: $${suggestedPrice} MXN. Fuente: ${sourceName}.` },
        ])
      } catch { /* use default */ }

      const { data: product, error } = await supabaseAdmin.from('products').insert([{
        name: cleanTitle,
        description,
        price: suggestedPrice,
        cost_price: item.price,
        stock: item.available_quantity || item.stock || 50,
        category,
        images: imgs,
        source_url: item.permalink || item.source_url || '',
        source_name: sourceName,
        cj_id: item.cj_id || item.cj_pid || '',
        active: true,
      }]).select().single()

      if (error) errors.push(`${cleanTitle.slice(0, 40)} — ${error.message}`)
      else inserted.push(product)

      await new Promise(r => setTimeout(r, 150))
    }

    return NextResponse.json({
      success: true,
      search_query: searchQuery,
      total_found: products.length,
      inserted: inserted.length,
      skipped: skipped.length,
      errors: errors.length,
      error_details: errors.slice(0, 5),
      products: inserted.slice(0, 10),
      source: sourceName,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
