import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY!
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Modelo rápido y barato de Groq
const GROQ_MODEL = 'llama3-8b-8192'

interface RawProduct {
  name: unknown
  description: unknown
  price: unknown
  cost_price: unknown
  stock: unknown
  category: unknown
  images: unknown
  source_url: unknown
  source_name: unknown
  active: unknown
  sold: unknown
}

export async function POST(req: NextRequest) {
  try {
    const { products, margin = 30 } = await req.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de productos' }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
    }

    // Procesar en lotes de 5 para no saturar la API
    const BATCH_SIZE = 5
    const processedProducts: unknown[] = []

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map((product: RawProduct) => processProductWithGroq(product, margin))
      )
      processedProducts.push(...batchResults)
    }

    return NextResponse.json({
      success: true,
      count: processedProducts.length,
      products: processedProducts,
    })

  } catch (error) {
    console.error('Error procesando con Groq:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function processProductWithGroq(product: RawProduct, marginPct: number) {
  const costPrice = Number(product.cost_price) || Number(product.price) || 0
  const suggestedPrice = costPrice * (1 + marginPct / 100)

  const prompt = `Eres un experto en ecommerce mexicano. Analiza este producto de AliExpress y devuelve un JSON mejorado.

PRODUCTO ORIGINAL:
- Nombre: ${product.name}
- Descripción: ${product.description || 'Sin descripción'}
- Precio costo: $${costPrice} MXN
- Categoría original: ${product.category}

INSTRUCCIONES:
1. Crea un nombre comercial atractivo en español (máx 80 chars), sin marcas chinas raras
2. Escribe una descripción de venta persuasiva en español (150-250 palabras), resaltando beneficios
3. Sugiere una categoría limpia en español (ej: "Electrónica", "Hogar", "Moda", "Deportes", "Belleza", "Juguetes", "Herramientas")
4. El precio de venta sugerido es $${suggestedPrice.toFixed(2)} MXN (margen ${marginPct}%), ajústalo si no suena comercial (terminar en .99 o .00)
5. Lista 3-5 palabras clave SEO relevantes para México

Responde ÚNICAMENTE con este JSON (sin markdown, sin explicaciones):
{
  "name": "nombre mejorado",
  "description": "descripción persuasiva",
  "category": "categoría limpia",
  "price": precio_numerico,
  "keywords": ["kw1", "kw2", "kw3"]
}`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
      }),
    })

    if (!response.ok) {
      console.error('Groq error:', await response.text())
      // Si Groq falla, devolver el producto sin procesar pero con precio con margen
      return { ...product, price: suggestedPrice }
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content ?? ''

    // Parsear el JSON que devuelve Groq
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const groqResult = JSON.parse(cleaned)

    // Mergear: datos originales + mejoras de Groq
    return {
      ...product,
      name: groqResult.name ?? product.name,
      description: groqResult.description ?? product.description,
      category: groqResult.category ?? product.category,
      price: groqResult.price ?? suggestedPrice,
      cost_price: costPrice,
      // Guardamos keywords como parte de la descripción si hay
      _keywords: groqResult.keywords ?? [],
    }

  } catch (parseError) {
    console.error('Error parseando respuesta de Groq:', parseError)
    // Fallback: devolver producto con precio ajustado
    return { ...product, price: suggestedPrice, cost_price: costPrice }
  }
}
