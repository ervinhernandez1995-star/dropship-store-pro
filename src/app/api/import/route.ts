import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

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
    const body = await req.json()

    // New format: browser already fetched the data, sends it here to save
    if (body.productData) {
      const { title, price, stock, images, attrs, source_url, source_name, category_id } = body.productData

      if (!title || !price || price <= 0) {
        return NextResponse.json({ error: 'Datos incompletos del producto' }, { status: 400 })
      }

      const description = await groqChat([
        { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción de producto atractiva en español. Máximo 80 palabras. Solo párrafo, sin listas ni asteriscos.' },
        { role: 'user', content: `Descripción para: "${title}". ${attrs ? `Características: ${attrs}.` : ''} Precio: $${price} MXN.` },
      ])

      const suggestedPrice = Math.ceil(price * 1.20)
      const category = detectCategory(category_id || '')

      const { data: product, error } = await supabaseAdmin.from('products').insert([{
        name: title,
        description,
        price: suggestedPrice,
        cost_price: price,
        stock: stock || 10,
        category,
        images: images || [],
        source_url,
        source_name,
        active: true,
      }]).select().single()

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
