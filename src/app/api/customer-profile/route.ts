import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export async function POST(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  const body = await req.json()
  await supabaseAdmin.from('customers').update({ name: body.name, phone: body.phone, updated_at: new Date().toISOString() }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
