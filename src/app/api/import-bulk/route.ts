import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function fixImg(url: string): string {
  if (!url) return ''
  return url.replace('http://', 'https://').replace(/-I\.jpg$/, '-O.jpg').replace(/-S\.jpg$/, '-O.jpg')
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

export async function POST(req: NextRequest) {
  try {
    // Browser already fetched products from ML, sends them here to save
    const { products, margin = 20, sourceName = 'MercadoLibre', searchQuery = '' } = await req.json()

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
      if (!item.price || item.price <= 0) { errors.push(`${item.title?.slice(0, 40)} — sin precio`); continue }

      const imgs = item.thumbnail ? [fixImg(item.thumbnail)] : []
      const suggestedPrice = Math.ceil(item.price * (1 + margin / 100))

      let description = `${item.title} — excelente calidad al mejor precio. ¡Envío rápido!`
      try {
        description = await groqChat([
          { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción atractiva en español. Máximo 60 palabras. Solo párrafo.' },
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

      await new Promise(r => setTimeout(r, 100))
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
    console.error('Bulk import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
