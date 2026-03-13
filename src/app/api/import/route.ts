import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function fixImageUrl(url: string): string {
  if (!url) return ''
  return url.replace('http://', 'https://').replace(/-I\.jpg/, '-O.jpg').replace(/-S\.jpg/, '-O.jpg').replace(/-V\.jpg/, '-O.jpg')
}

function detectCategory(catId: string): string {
  const map: Record<string, string> = {
    MLM1648: 'Electrónica', MLM1276: 'Electrónica', MLM1051: 'Electrónica',
    MLM1000: 'Electrónica', MLM1430: 'Hogar', MLM1574: 'Hogar',
    MLM1168: 'Deportes', MLM1182: 'Moda', MLM1185: 'Moda',
    MLM1246: 'Belleza', MLM1132: 'Automotriz', MLM1367: 'Juguetes',
  }
  return Object.entries(map).find(([k]) => catId.startsWith(k))?.[1] || 'General'
}

async function fetchMLItem(itemId: string) {
  const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'Escribe una URL primero' }, { status: 400 })

    const isMercadoLibre = url.includes('mercadolibre')
    const isAliExpress = url.includes('aliexpress')

    if (!isMercadoLibre && !isAliExpress) {
      return NextResponse.json({ error: 'Pega una URL de MercadoLibre o AliExpress' }, { status: 400 })
    }

    let rawTitle = '', originalPrice = 0, images: string[] = [], attrs = '', sourceName = '', stock = 10, category = 'General'

    if (isMercadoLibre) {
      sourceName = 'MercadoLibre'
      let mlData: any = null

      // Strategy 1: /p/MLM... product page
      const pageMatch = url.match(/\/p\/(MLM\d+)/i)
      if (pageMatch) {
        const pageRes = await fetch(`https://api.mercadolibre.com/products/${pageMatch[1]}/items?limit=3`, { headers: { Accept: 'application/json' } })
        if (pageRes.ok) {
          const pd = await pageRes.json()
          const firstId = pd.results?.[0]?.id
          if (firstId) mlData = await fetchMLItem(firstId)
        }
        if (!mlData) mlData = await fetchMLItem(pageMatch[1])
      }

      // Strategy 2: direct item ID — pick longest MLM number (item IDs are longer than tracking IDs)
      if (!mlData) {
        const allMatches = [...url.matchAll(/MLM-?(\d+)/gi)]
        const best = allMatches.sort((a, b) => b[1].length - a[1].length)[0]
        if (best) mlData = await fetchMLItem(`MLM${best[1]}`)
      }

      // Strategy 3: search by slug keywords
      if (!mlData) {
        const slug = url.split('/').find((s: string) => s.length > 15 && s.includes('-') && !s.toLowerCase().includes('mlm') && !s.includes('polycard')) || ''
        const keywords = slug.split('?')[0].split('-').slice(0, 6).join(' ').trim()
        if (keywords.length > 5) {
          const sr = await fetch(`https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keywords)}&limit=1`, { headers: { Accept: 'application/json' } })
          if (sr.ok) {
            const sd = await sr.json()
            const first = sd.results?.[0]
            if (first) {
              mlData = await fetchMLItem(first.id)
              if (!mlData) { rawTitle = first.title; originalPrice = first.price; stock = first.available_quantity || 10; images = first.thumbnail ? [fixImageUrl(first.thumbnail)] : []; category = detectCategory(first.category_id || '') }
            }
          }
        }
      }

      if (mlData?.id) {
        rawTitle = mlData.title || ''
        originalPrice = mlData.price || 0
        stock = mlData.available_quantity || 10
        category = detectCategory(mlData.category_id || '')
        images = (mlData.pictures || []).slice(0, 6).map((p: any) => fixImageUrl(p.url || p.secure_url || '')).filter(Boolean)
        if (images.length === 0 && mlData.thumbnail) images = [fixImageUrl(mlData.thumbnail)]
        attrs = (mlData.attributes || []).slice(0, 10).map((a: any) => `${a.name}: ${a.value_name}`).filter((a: string) => !a.includes('null') && !a.includes('undefined') && a.length < 80).join(', ')
      }

      if (!rawTitle) {
        const slug = url.split('/').find((s: string) => s.length > 10 && s.includes('-') && !s.includes('MLM') && !s.includes('polycard')) || ''
        rawTitle = slug.split('?')[0].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80) || 'Producto de MercadoLibre'
      }
      if (!originalPrice || originalPrice <= 0) {
        return NextResponse.json({ error: 'No se pudo obtener el precio real del producto. Intenta con otro enlace directo al producto.' }, { status: 400 })
      }

    } else {
      sourceName = 'AliExpress'
      const decoded = decodeURIComponent(url)
      const fromPath = decoded.split('/').filter((s: string) => s.length > 10 && isNaN(Number(s)) && !s.includes('.'))[0] || ''
      rawTitle = fromPath.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80) || 'Producto AliExpress'
      originalPrice = 299; stock = 50; images = []
    }

    if (!rawTitle) rawTitle = `Producto de ${sourceName}`

    const description = await groqChat([
      { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripciones de productos atractivas en español. Máximo 80 palabras. Solo párrafo, sin listas.' },
      { role: 'user', content: `Descripción para: "${rawTitle}". ${attrs ? `Características: ${attrs}.` : ''} Precio: $${originalPrice} MXN.` },
    ])

    const suggestedPrice = Math.ceil(originalPrice * 1.20)

    const { data: product, error } = await supabaseAdmin.from('products').insert([{
      name: rawTitle, description, price: suggestedPrice, cost_price: originalPrice,
      stock, category, images, source_url: url, source_name: sourceName, active: true,
    }]).select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, product, original_price: originalPrice, suggested_price: suggestedPrice, images_found: images.length, source: sourceName })

  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}
