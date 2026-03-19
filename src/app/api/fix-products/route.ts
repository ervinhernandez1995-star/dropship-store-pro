import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text || '')
}

async function translateToSpanish(text: string): Promise<string> {
  try {
    const result = await groqChat([
      { role: 'system', content: 'Translate this product title to natural Spanish for Mexico. Return ONLY the translated title, no quotes.' },
      { role: 'user', content: text },
    ])
    return result.trim().replace(/^["']|["']$/g, '') || text
  } catch { return text }
}

// POST /api/fix-products — translates all Chinese product titles and regenerates descriptions
export async function POST(req: NextRequest) {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, cost_price')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const chineseProducts = (products || []).filter(p => hasChinese(p.name) || hasChinese(p.description))

  let fixed = 0
  const errors: string[] = []

  for (const product of chineseProducts) {
    try {
      const newName = hasChinese(product.name) ? await translateToSpanish(product.name) : product.name
      
      let newDesc = product.description
      if (hasChinese(product.description) || !product.description || product.description.length < 10) {
        try {
          newDesc = await groqChat([
            { role: 'system', content: 'Eres experto en ecommerce mexicano. Escribe descripción atractiva en español. Máximo 70 palabras. Solo párrafo.' },
            { role: 'user', content: `Producto: "${newName}". Precio: $${product.price} MXN.` },
          ])
        } catch { newDesc = `${newName} — producto de calidad con envío rápido a todo México.` }
      }

      await supabaseAdmin.from('products').update({ name: newName, description: newDesc }).eq('id', product.id)
      fixed++
      await new Promise(r => setTimeout(r, 300))
    } catch (e: any) {
      errors.push(product.name.slice(0, 40))
    }
  }

  return NextResponse.json({ success: true, total: chineseProducts.length, fixed, errors })
}
