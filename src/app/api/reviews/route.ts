import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function GET(req: NextRequest) {
  const productId = new URL(req.url).searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id requerido' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data || [], { headers: cors })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { product_id, customer_name, rating, comment, customer_id } = body

  if (!product_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('product_reviews').insert({
    product_id, customer_id: customer_id || null,
    customer_name: customer_name || 'Cliente verificado',
    rating, comment: comment || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: cors })
}
