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
      { role: 'system', content: 'Translate Chinese product title to natural Spanish for Mexico. Return ONLY the translated title, no quotes, no explanation.' },
      { role: 'user', content: text },
    ])
    return result.trim().replace(/^["']|["']$/g, '') || text
  } catch { return text }
}

function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (/auricular|headphone|bluetooth|smartwatch|reloj.inteligente|bocina|speaker|cargador|cable|gaming|mouse|teclado|camara|led|earphone|earbuds|tws|wireless|usb|bateria|power.bank|laptop|tablet|celular|phone/.test(n)) return 'Electrónica'
  if (/camisa|pantalon|vestido|zapato|tenis|bolsa|mochila|ropa|sueter|hoodie|legging|bikini|falda|blusa|playera|pulsera|collar|aretes|gorra|sombrero/.test(n)) return 'Moda'
  if (/cocina|lampara|silla|mesa|decoracion|cojin|cortina|hogar|alfombra|organizador|almohada|toalla|jarron|vela/.test(n)) return 'Hogar'
  if (/gym|fitness|yoga|deporte|correr|ciclismo|pesas|banda.elastica|colchoneta|running|sport/.test(n)) return 'Deportes'
  if (/crema|maquillaje|perfume|serum|labial|mascara|bronceador|skincare|hidratante|belleza|beauty/.test(n)) return 'Belleza'
  if (/juguete|niño|bebe|peluche|puzzle|muñeca|figure|action.figure|kids|infantil/.test(n)) return 'Juguetes'
  if (/auto|carro|vehiculo|car|motor|soporte.carro|limpieza.auto/.test(n)) return 'Automotriz'
  return 'General'
}

export async function POST(req: NextRequest) {
  try {
    const { products, margin = 20, sourceName = 'CJDropshipping', searchQuery = '' } = await req.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No se recibieron productos' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('products').select('source_url, cj_id')
    
    const existingUrls = new Set((existing || []).map((p: any) => p.source_url).filter(Boolean))
    const existingCJIds = new Set((existing || []).map((p: any) => p.cj_id).filter(Boolean))

    const inserted: any[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const item of products) {
      const cjId = item.cj_id || item.cj_pid || ''
      
      // Skip if already exists by URL or CJ ID
      if (existingUrls.has(item.permalink) || existingUrls.has(item.source_url)) {
        skipped.push(String(item.title || '').slice(0, 40))
        continue
      }
      if (cjId && existingCJIds.has(cjId)) {
        skipped.push(String(item.title || '').slice(0, 40))
        continue
      }

      // Handle price = 0 gracefully — use a default or skip based on source
      let rawPrice = parseFloat(String(item.price || '0'))
      if (rawPrice <= 0) {
        // Try to get price from other fields
        rawPrice = parseFloat(String(item.cost_price || item.original_price || '0'))
      }
      if (rawPrice <= 0) {
        errors.push(`Sin precio: "${String(item.title || '').slice(0, 35)}"`)
        continue
      }

      // Translate Chinese title
      const rawTitle = String(item.titleEs || item.title || '')
      if (!rawTitle || rawTitle.length < 2) { errors.push('Título vacío'); continue }
      
      const cleanTitle = hasChinese(rawTitle) ? await translateToSpanish(rawTitle) : rawTitle

      // Images
      const rawImages = Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [item.thumbnail, item.image].filter(Boolean)
      const imgs = rawImages.map(fixImg).filter(Boolean).slice(0, 8)

      const suggestedPrice = Math.ceil(rawPrice * (1 + margin / 100))
      const category = detectCategory(cleanTitle)

      // Generate description
      let description = `${cleanTitle} — producto de calidad con envío rápido a todo México.`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de venta atractiva en español. Máximo 70 palabras. Solo párrafo, sin listas.' },
          { role: 'user', content: `Producto: "${cleanTitle}". Precio venta: $${suggestedPrice} MXN.` },
        ])
      } catch { /* keep default */ }

      const { data: product, error } = await supabaseAdmin.from('products').insert([{
        name: cleanTitle,
        description: description || `${cleanTitle} — disponible con envío rápido.`,
        price: suggestedPrice,
        cost_price: rawPrice,
        stock: item.available_quantity || item.stock || 50,
        category,
        images: imgs,
        source_url: item.permalink || item.source_url || `https://cjdropshipping.com/product/-p-${cjId}.html`,
        source_name: sourceName,
        cj_id: cjId,
        active: true,
      }]).select().single()

      if (error) {
        errors.push(`"${cleanTitle.slice(0, 35)}" — ${error.message.slice(0, 60)}`)
      } else {
        inserted.push(product)
        if (cjId) existingCJIds.add(cjId)
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
