import { NextRequest, NextResponse } from 'next/server'
import { chatWithStore } from '@/lib/groq'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    const { data: products } = await supabaseAdmin
      .from('products').select('name, price, category, stock').eq('active', true).limit(30)
    const { data: config } = await supabaseAdmin
      .from('store_config').select('key, value')
    const storeName = config?.find(c => c.key === 'store_name')?.value || 'TodoClick MX'
    const reply = await chatWithStore(message, products || [], storeName)
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ reply: 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.' })
  }
}
