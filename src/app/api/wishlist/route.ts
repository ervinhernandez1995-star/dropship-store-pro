import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getUserId(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user?.id || null
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json([])
  const { data } = await supabaseAdmin.from('wishlists').select('product_id').eq('customer_id', userId)
  return NextResponse.json(data?.map(w => w.product_id) || [])
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { product_id, action } = await req.json()
  if (action === 'remove') {
    await supabaseAdmin.from('wishlists').delete().eq('customer_id', userId).eq('product_id', product_id)
  } else {
    await supabaseAdmin.from('wishlists').upsert({ customer_id: userId, product_id, created_at: new Date().toISOString() })
  }
  return NextResponse.json({ ok: true })
}
