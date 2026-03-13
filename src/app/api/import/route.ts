import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || !url.includes('mercadolibre')) {
      return NextResponse.json({ error: 'Por favor pega una URL válida de MercadoLibre' }, { status: 400 })
    }

    // Extraer el ID del producto de la URL de MercadoLibre
    // URLs como: https://www.mercadolibre.com.mx/articulo/MLM-123456789
    const mlmMatch = url.match(/MLM-?(\d+)/i)
    if (!mlmMatch) {
      return NextResponse.json({ error: 'No se pudo identificar el producto en la URL' }, { status: 400 })
    }
    const itemId = `MLM${mlmMatch[1]}`

    // Llamar a la API pública de MercadoLibre (no requiere autenticación para datos básicos)
    const mlRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Accept': 'application/json' }
    })

    if (!mlRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el producto. Verifica que la URL sea correcta.' }, { status: 400 })
    }

    const mlData = await mlRes.json()

    // Extraer imágenes
    const images: string[] = []
    if (mlData.pictures && mlData.pictures.length > 0) {
      mlData.pictures.slice(0, 5).forEach((pic: any) => {
        if (pic.url) images.push(pic.url.replace('-I.jpg', '-O.jpg').replace('http://', 'https://'))
      })
    }

    // Extraer atributos relevantes
    const attrs = (mlData.attributes || [])
      .slice(0, 8)
      .map((a: any) => `${a.name}: ${a.value_name}`)
      .filter((a: string) => !a.includes('null'))
      .join(', ')

    // Usar Groq para generar descripción atractiva basada en los datos reales
    const rawTitle = mlData.title || 'Producto'
    const originalPrice = mlData.price || 0
    const condition = mlData.condition === 'new' ? 'nuevo' : 'usado'

    const description = await groqChat([{
      role: 'system',
      content: 'Eres experto en ecommerce mexicano. Escribes descripciones de productos atractivas y persuasivas en español. Máximo 100 palabras. Sin emojis excesivos.',
    }, {
      role: 'user',
      content: `Escribe una descripción de venta para: "${rawTitle}". Condición: ${condition}. Características: ${attrs || 'No especificadas'}. Precio de referencia: $${originalPrice} MXN.`,
    }])

    // Calcular precio sugerido con margen del 15%
    const suggestedPrice = Math.ceil(originalPrice * 1.15)

    // Detectar categoría automáticamente
    const categoryMap: Record<string, string> = {
      'MLM1051': 'Celulares', 'MLM1648': 'Electrónica', 'MLM1276': 'Electrónica',
      'MLM1430': 'Hogar', 'MLM1574': 'Hogar', 'MLM1168': 'Deportes',
      'MLM1182': 'Moda', 'MLM1246': 'Belleza', 'MLM1132': 'Automotriz',
    }
    const catId = mlData.category_id || ''
    const category = Object.entries(categoryMap).find(([k]) => catId.startsWith(k))?.[1] || 'General'

    // Guardar en Supabase
    const { data: product, error } = await supabaseAdmin.from('products').insert([{
      name: rawTitle,
      description,
      price: suggestedPrice,
      cost_price: originalPrice,
      stock: mlData.available_quantity || 10,
      category,
      images,
      source_url: url,
      source_name: 'MercadoLibre',
      active: true,
    }]).select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      product,
      original_price: originalPrice,
      suggested_price: suggestedPrice,
      margin: '15%',
      images_found: images.length,
    })

  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ error: e.message || 'Error al importar el producto' }, { status: 500 })
  }
}
