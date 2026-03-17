import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('customer_token')?.value
  if (!token) return null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${token}`,
      }
    })
    if (!res.ok) return null
    const user = await res.json()
    return user?.id || null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json([])
  
  try {
    const { data } = await supabaseAdmin
      .from('wishlists')
      .select('product_id')
      .eq('customer_id', userId)
    return NextResponse.json(data?.map((w: any) => w.product_id) || [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  
  const { product_id, action } = await req.json()
  
  // Ensure customer exists in customers table
  await supabaseAdmin.from('customers').upsert({
    id: userId,
    email: '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id', ignoreDuplicates: true })

  if (action === 'remove') {
    await supabaseAdmin.from('wishlists')
      .delete()
      .eq('customer_id', userId)
      .eq('product_id', product_id)
  } else {
    await supabaseAdmin.from('wishlists')
      .upsert({ customer_id: userId, product_id, created_at: new Date().toISOString() }, { onConflict: 'customer_id,product_id', ignoreDuplicates: true })
  }
  return NextResponse.json({ ok: true })
}
