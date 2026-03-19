import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function detectCategory(catIdOrName: string): string {
  // Try ML category ID first
  const mlMap: Record<string, string> = {
    MLM1648: 'Electrónica', MLM1276: 'Electrónica', MLM1051: 'Electrónica',
    MLM1430: 'Hogar', MLM1574: 'Hogar', MLM1168: 'Deportes',
    MLM1182: 'Moda', MLM1185: 'Moda', MLM1246: 'Belleza',
    MLM1132: 'Automotriz', MLM1367: 'Juguetes',
  }
  const byId = Object.entries(mlMap).find(([k]) => catIdOrName.startsWith(k))?.[1]
  if (byId) return byId

  // Detect from product name keywords
  const n = catIdOrName.toLowerCase()
  if (/auricular|headphone|bluetooth|smartwatch|bocina|speaker|cargador|cable|gaming|mouse|teclado|camara|led|electronic|phone|celular|earphone|earbuds|tws|wireless|usb|bateria|power.?bank/.test(n)) return 'Electrónica'
  if (/ropa|camisa|pantalon|vestido|zapato|tenis|bolsa|mochila|fashion|shirt|dress|shoe|pants|jacket|hoodie|sudadera|blusa|playera|legging|bikini|falda|pulsera|collar|aretes/.test(n)) return 'Moda'
  if (/hogar|cocina|lampara|silla|mesa|decoracion|cojin|cortina|alfombra|organizador|almohada|toalla|jarron/.test(n)) return 'Hogar'
  if (/deporte|gym|fitness|yoga|correr|ciclismo|sport|exercise|workout|pesas|running/.test(n)) return 'Deportes'
  if (/belleza|maquillaje|crema|perfume|makeup|skincare|serum|labial|mascara|bronceador|hidratante/.test(n)) return 'Belleza'
  if (/juguete|niño|toy|game|puzzle|kids|infantil|bebe|peluche|figura|muñeca/.test(n)) return 'Juguetes'
  if (/auto|carro|vehiculo|car|automotive|motor/.test(n)) return 'Automotriz'
  return 'General'
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // New format: browser already fetched the data, sends it here to save
    if (body.productData) {
      const { title, price, stock, images, attrs, source_url, source_name, category_id, cj_pid, ali_id } = body.productData

      if (!title || !price || price <= 0) {
        return NextResponse.json({ error: 'Datos incompletos del producto' }, { status: 400 })
      }

      // Detect if title is in Chinese and translate it
      const hasChinese = /[一-鿿]/.test(title)
      const hasChineseAttrs = /[一-鿿]/.test(attrs || '')

      let cleanTitle = title
      if (hasChinese) {
        try {
          cleanTitle = await groqChat([
            { role: 'system', content: 'Translate this Chinese product title to Spanish (Mexico). Make it natural and commercial. Return ONLY the translated title, nothing else.' },
            { role: 'user', content: title },
          ])
          cleanTitle = cleanTitle.trim().replace(/^["']|["']$/g, '')
        } catch { cleanTitle = title }
      }

      const cleanAttrs = hasChineseAttrs ? '' : (attrs || '')

      const description = await groqChat([
        { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de producto atractiva en español. Máximo 80 palabras. Solo párrafo, sin listas ni asteriscos.' },
        { role: 'user', content: `Descripción para: "${cleanTitle}". ${cleanAttrs ? `Características: ${cleanAttrs}.` : ''} Precio: $${price} MXN.` },
      ])

      const suggestedPrice = Math.ceil(price * 1.20)
      const category = detectCategory(category_id || '') === 'General' ? detectCategory(cleanTitle) : detectCategory(category_id || '')

      // Clean and deduplicate images
      const cleanImages = Array.isArray(images) 
        ? images.filter(Boolean).filter((img: string, i: number, arr: string[]) => arr.indexOf(img) === i)
            .map((img: string) => img.replace('http://', 'https://')).slice(0, 8)
        : []

      // Build insert data — handle missing cj_id column gracefully
      const insertData: any = {
        name: cleanTitle,
        description,
        price: suggestedPrice,
        cost_price: price,
        stock: stock || 10,
        category,
        images: cleanImages,
        source_url,
        source_name,
        active: true,
      }
      // Add optional fields if they exist in the schema
      const cjIdVal = String(body.productData?.cj_id || body.productData?.cj_pid || '')
      if (cjIdVal) insertData.cj_id = cjIdVal

      let product: any = null
      let error: any = null
      const res1 = await supabaseAdmin.from('products').insert([insertData]).select().single()
      
      if (res1.error?.message?.includes('cj_id')) {
        // Column doesn't exist yet — retry without cj_id
        delete insertData.cj_id
        const res2 = await supabaseAdmin.from('products').insert([insertData]).select().single()
        product = res2.data
        error = res2.error
      } else {
        product = res1.data
        error = res1.error
      }

      if (error) throw new Error(error.message)

      return NextResponse.json({
        success: true,
        product,
        original_price: price,
        suggested_price: suggestedPrice,
        images_found: (images || []).length,
        source: source_name,
      })
    }

    return NextResponse.json({ error: 'Formato de datos incorrecto' }, { status: 400 })

  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar' }, { status: 500 })
  }
}

// CJ product import helper — called when source is cjdropshipping
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pid = searchParams.get('cj_pid')
  if (!pid) return NextResponse.json({ error: 'pid requerido' }, { status: 400 })
  
  const detail = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cj-proxy?pid=${pid}`)
  return detail
}
