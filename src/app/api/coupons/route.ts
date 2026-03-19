import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

// Validate coupon
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Cupón inválido o expirado' }, { status: 404 })
  if (data.expires_at && new Date(data.expires_at) < new Date()) return NextResponse.json({ error: 'Cupón expirado' }, { status: 400 })
  if (data.uses >= data.max_uses) return NextResponse.json({ error: 'Cupón agotado' }, { status: 400 })

  return NextResponse.json({ valid: true, coupon: { code: data.code, type: data.discount_type, value: data.discount_value, min_order: data.min_order } }, { headers: cors })
}

// Admin: create coupon
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('coupons').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: cors })
}
