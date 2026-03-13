import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'Escribe una URL primero' }, { status: 400 })

    const isMercadoLibre = url.includes('mercadolibre')
    const isAliExpress = url.includes('aliexpress')

    if (!isMercadoLibre && !isAliExpress) {
      return NextResponse.json({ error: 'Pega una URL de MercadoLibre (mercadolibre.com.mx) o AliExpress (aliexpress.com)' }, { status: 400 })
    }

    let rawTitle = ''
    let originalPrice = 0
    let images: string[] = []
    let attrs = ''
    let sourceName = ''
    let stock = 10
    let category = 'General'

    if (isMercadoLibre) {
      sourceName = 'MercadoLibre'

      // Soporta AMBOS formatos:
      // 1. /p/MLM47809248  (página de producto - busca el primer artículo)
      // 2. /MLM-2309535267 o MLM2309535267 (artículo individual)
      
      // Primero intentar con ID de página (/p/MLM...)
      const pageMatch = url.match(/\/p\/(MLM\d+)/i)
      // Luego intentar con ID de artículo (MLM-... o MLM...)
      const itemMatch = url.match(/MLM-?(\d+)/i)

      let itemId = ''

      if (pageMatch) {
        // Es una página de producto - buscar artículos de esa página
        const productPageId = pageMatch[1]
        const searchRes = await fetch(
          `https://api.mercadolibre.com/products/${productPageId}/items?limit=1`,
          { headers: { Accept: 'application/json' } }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.results && searchData.results.length > 0) {
            itemId = searchData.results[0].id
          }
        }
        // Si no encontró items por la página, usar el ID de la página directamente
        if (!itemId) itemId = productPageId
      } else if (itemMatch) {
        itemId = `MLM${itemMatch[1]}`
      }

      if (!itemId) {
        return NextResponse.json({ error: 'No se pudo identificar el producto en la URL de MercadoLibre.' }, { status: 400 })
      }

      // Intentar obtener el artículo directamente
      const mlRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: { Accept: 'application/json' }
      })

      // Si falla con el ID de página, buscar por búsqueda usando el título de la URL
      if (!mlRes.ok) {
        // Extraer palabras clave del título en la URL
        const urlPath = url.split('/').find((s: string) => s.length > 20 && s.includes('-')) || ''
        const keywords = urlPath.split('-').slice(0, 5).join(' ')
        
        if (keywords) {
          const searchRes = await fetch(
            `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keywords)}&limit=1`,
            { headers: { Accept: 'application/json' } }
          )
          if (searchRes.ok) {
            const sd = await searchRes.json()
            if (sd.results?.length > 0) {
              const firstItem = sd.results[0]
              rawTitle = firstItem.title
              originalPrice = firstItem.price
              stock = firstItem.available_quantity || 10
              images = firstItem.thumbnail ? [firstItem.thumbnail.replace('-I.jpg', '-O.jpg')] : []
              category = 'General'
            }
          }
        }
      } else {
        const d = await mlRes.json()
        rawTitle = d.title || 'Producto'
        originalPrice = d.price || 0
        stock = d.available_quantity || 10
        images = (d.pictures || []).slice(0, 5)
          .map((p: any) => p.url?.replace('-I.jpg', '-O.jpg').replace('http://', 'https://'))
          .filter(Boolean)
        attrs = (d.attributes || []).slice(0, 8)
          .map((a: any) => `${a.name}: ${a.value_name}`)
          .filter((a: string) => !a.includes('null') && !a.includes('undefined'))
          .join(', ')
        const catMap: Record<string, string> = {
          MLM1648: 'Electrónica', MLM1276: 'Electrónica',
          MLM1430: 'Hogar', MLM1168: 'Deportes',
          MLM1182: 'Moda', MLM1246: 'Belleza', MLM1132: 'Automotriz',
        }
        category = Object.entries(catMap).find(([k]) => (d.category_id || '').startsWith(k))?.[1] || 'General'
      }

      if (!rawTitle) {
        // Último recurso: extraer nombre de la URL
        const urlParts = url.split('/').filter((s: string) => s.length > 10 && s.includes('-') && !s.includes('MLM'))
        rawTitle = urlParts[0]?.split('?')[0].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80) || 'Producto de MercadoLibre'
        if (!originalPrice) originalPrice = 499
      }

    } else {
      // ALIEXPRESS
      sourceName = 'AliExpress'
      const decoded = decodeURIComponent(url)
      const fromPath = decoded.split('/').filter((s: string) => s.length > 10 && isNaN(Number(s)) && !s.includes('.'))[0] || ''
      rawTitle = fromPath.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80) || 'Producto AliExpress'
      originalPrice = 299
      stock = 50
      images = []
    }

    if (!rawTitle) rawTitle = `Producto de ${sourceName}`
    if (!originalPrice || originalPrice <= 0) originalPrice = 299

    // Groq genera descripción atractiva
    const description = await groqChat([
      { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribes descripciones de productos atractivas y persuasivas en español. Máximo 100 palabras. Párrafo continuo, sin listas.' },
      { role: 'user', content: `Descripción para: "${rawTitle}". ${attrs ? `Características: ${attrs}.` : ''} Precio: $${originalPrice} MXN. Fuente: ${sourceName}.` },
    ])

    const suggestedPrice = Math.ceil(originalPrice * 1.20)

    const { data: product, error } = await supabaseAdmin.from('products').insert([{
      name: rawTitle,
      description,
      price: suggestedPrice,
      cost_price: originalPrice,
      stock,
      category,
      images,
      source_url: url,
      source_name: sourceName,
      active: true,
    }]).select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      product,
      original_price: originalPrice,
      suggested_price: suggestedPrice,
      images_found: images.length,
      source: sourceName,
    })

  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
