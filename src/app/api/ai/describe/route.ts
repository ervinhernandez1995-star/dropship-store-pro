import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, price, action } = body

    // Translate action
    if (action === 'translate') {
      const translated = await groqChat([
        { role: 'system', content: 'Translate this product title/text to natural Spanish for Mexico. Return ONLY the translated text, no quotes, no explanation.' },
        { role: 'user', content: name },
      ])
      return NextResponse.json({ translated: translated.trim().replace(/^["']|["']$/g, '') })
    }

    // Generate description
    const description = await groqChat([
      { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe una descripción de producto atractiva y persuasiva en español. Máximo 80 palabras. Solo párrafo, sin listas ni asteriscos.' },
      { role: 'user', content: `Producto: "${name}". Categoría: ${category || 'General'}. Precio: $${price || 0} MXN.` },
    ])

    return NextResponse.json({ description })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
