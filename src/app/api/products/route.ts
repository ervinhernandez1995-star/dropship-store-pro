import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')
  const search = searchParams.get('search')
  const admin = searchParams.get('admin')

  let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false })

  if (active === 'true' && !admin) query = query.eq('active', true)
  if (category && category !== 'Todos') query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('products').insert([{
    name: body.name,
    description: body.description,
    price: Number(body.price),
    cost_price: Number(body.cost_price || 0),
    stock: Number(body.stock || 0),
    category: body.category || 'General',
    images: body.images || [],
    source_url: body.source_url || '',
    source_name: body.source_name || '',
    active: body.active !== false,
  }]).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
