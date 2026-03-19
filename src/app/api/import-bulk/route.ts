import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

const USD_TO_MXN = 17.5 // approximate exchange rate

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
      { role: 'system', content: 'Translate this product title to natural Spanish for Mexico. Return ONLY the translated title, no quotes, no explanation.' },
      { role: 'user', content: text },
    ])
    return result.trim().replace(/^["']|["']$/g, '') || text
  } catch { return text }
}

function detectCategory(name: string): string {
  const n = (name || '').toLowerCase()
  if (/auricular|headphone|bluetooth|smartwatch|reloj.inteligente|bocina|speaker|cargador|cable|gaming|mouse|teclado|camara|led|earphone|earbuds|tws|wireless|usb|bateria|power.bank|laptop|tablet|celular|phone|vr|gafas.virtual/.test(n)) return 'Electrónica'
  if (/camisa|pantalon|vestido|zapato|tenis|bolsa|mochila|ropa|sueter|hoodie|legging|bikini|falda|blusa|playera|pulsera|collar|aretes|gorra|sombrero/.test(n)) return 'Moda'
  if (/cocina|lampara|silla|mesa|decoracion|cojin|cortina|hogar|alfombra|organizador|almohada|toalla|jarron|vela/.test(n)) return 'Hogar'
  if (/gym|fitness|yoga|deporte|correr|ciclismo|pesas|banda.elastica|colchoneta|running|sport/.test(n)) return 'Deportes'
  if (/crema|maquillaje|perfume|serum|labial|mascara|bronceador|skincare|hidratante|belleza|beauty/.test(n)) return 'Belleza'
  if (/juguete|niño|bebe|peluche|puzzle|muñeca|figure|kids|infantil/.test(n)) return 'Juguetes'
  if (/auto|carro|vehiculo|car|motor|soporte.carro/.test(n)) return 'Automotriz'
  return 'General'
}

export async function POST(req: NextRequest) {
  try {
    const { products, margin = 30, sourceName = 'CJDropshipping', searchQuery = '' } = await req.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No se recibieron productos' }, { status: 400 })
    }

    // Get existing products to avoid duplicates
    const { data: existing } = await supabaseAdmin.from('products').select('source_url, name')
    const existingUrls = new Set((existing || []).map((p: any) => p.source_url).filter(Boolean))

    const inserted: any[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const item of products) {
      const sourceUrl = item.permalink || item.source_url || ''

      // Skip duplicates by URL
      if (sourceUrl && existingUrls.has(sourceUrl)) {
        skipped.push(String(item.title || '').slice(0, 40))
        continue
      }

      // Get price — CJ prices are in USD
      let rawPriceUSD = parseFloat(String(item.price || item.cost_price || '0'))
      if (rawPriceUSD <= 0) {
        errors.push(`Sin precio: "${String(item.title || '').slice(0, 35)}"`)
        continue
      }

      // Convert USD to MXN
      const priceInMXN = rawPriceUSD * USD_TO_MXN

      // Apply margin to get final selling price
      const suggestedPrice = Math.ceil(priceInMXN * (1 + margin / 100))

      // Translate title if Chinese
      const rawTitle = String(item.titleEs || item.title || '')
      if (!rawTitle || rawTitle.length < 2) { errors.push('Título vacío'); continue }
      const cleanTitle = hasChinese(rawTitle) ? await translateToSpanish(rawTitle) : rawTitle

      // Images
      const rawImages = Array.isArray(item.images) && item.images.length > 0
        ? item.images : [item.thumbnail, item.image].filter(Boolean)
      const imgs = rawImages.map(fixImg).filter(Boolean).slice(0, 8)

      const category = detectCategory(cleanTitle)

      // Description
      let description = `${cleanTitle} — producto de calidad con envío rápido a todo México.`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de venta atractiva en español. Máximo 70 palabras. Solo párrafo, sin listas.' },
          { role: 'user', content: `Producto: "${cleanTitle}". Precio: $${suggestedPrice} MXN.` },
        ])
      } catch { /* keep default */ }

      // Insert WITHOUT cj_id if column doesn't exist yet
      const insertData: any = {
        name: cleanTitle,
        description: description || `${cleanTitle} — disponible con envío rápido.`,
        price: suggestedPrice,
        cost_price: Math.round(priceInMXN * 100) / 100,
        stock: item.available_quantity || item.stock || 50,
        category,
        images: imgs,
        source_url: sourceUrl,
        source_name: sourceName,
        active: true,
      }

      // Try to add cj_id — if column exists
      const cjId = String(item.cj_id || item.cj_pid || '')
      if (cjId) insertData.cj_id = cjId

      const { data: product, error } = await supabaseAdmin
        .from('products').insert([insertData]).select().single()

      if (error) {
        // If error is about cj_id column, retry without it
        if (error.message.includes('cj_id')) {
          delete insertData.cj_id
          const { data: product2, error: error2 } = await supabaseAdmin
            .from('products').insert([insertData]).select().single()
          if (error2) errors.push(`"${cleanTitle.slice(0, 35)}" — ${error2.message.slice(0, 60)}`)
          else { inserted.push(product2); if (sourceUrl) existingUrls.add(sourceUrl) }
        } else {
          errors.push(`"${cleanTitle.slice(0, 35)}" — ${error.message.slice(0, 60)}`)
        }
      } else {
        inserted.push(product)
        if (sourceUrl) existingUrls.add(sourceUrl)
      }

      await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({
      success: true,
      search_query: searchQuery,
      total_found: products.length,
      inserted: inserted.length,
      skipped: skipped.length,
      errors: errors.length,
      error_details: errors.slice(0, 8),
      products: inserted.slice(0, 10),
      source: sourceName,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
