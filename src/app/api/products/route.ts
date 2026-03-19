import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')
  const search = searchParams.get('search')
  const admin = searchParams.get('admin')
  const limit = searchParams.get('limit')
  const exclude = searchParams.get('exclude')

  let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false })

  if (active === 'true' && !admin) query = query.eq('active', true)

  // Smart category filter — if no products match exact category, show all
  // This fixes the bug where CJ/AliExpress products land in "General"
  if (category && category !== 'Todos') {
    // Map display categories to keywords that might appear in product names/descriptions
    const categoryKeywords: Record<string, string[]> = {
      'Electrónica': ['auricular', 'headphone', 'bluetooth', 'smartwatch', 'reloj', 'bocina', 'speaker', 'cargador', 'cable', 'gaming', 'mouse', 'teclado', 'camara', 'led', 'electronics', 'electronic', 'phone', 'celular', 'tablet', 'laptop'],
      'Moda': ['ropa', 'camisa', 'pantalon', 'vestido', 'zapato', 'tenis', 'bolsa', 'mochila', 'fashion', 'clothing', 'shirt', 'dress', 'shoe', 'pants', 'jacket', 'hoodie', 'sudadera'],
      'Hogar': ['hogar', 'cocina', 'lampara', 'silla', 'mesa', 'decoracion', 'cojin', 'cortina', 'home', 'kitchen', 'furniture', 'lamp', 'chair', 'table'],
      'Deportes': ['deporte', 'gym', 'fitness', 'yoga', 'correr', 'ciclismo', 'sport', 'exercise', 'workout'],
      'Belleza': ['belleza', 'maquillaje', 'crema', 'perfume', 'beauty', 'makeup', 'skincare', 'serum'],
      'Juguetes': ['juguete', 'niño', 'toy', 'game', 'puzzle', 'lego', 'kids'],
      'Automotriz': ['auto', 'carro', 'vehiculo', 'car', 'automotive', 'motor'],
    }

    const keywords = categoryKeywords[category]
    if (keywords) {
      // Try exact category first
      const exactQuery = await supabaseAdmin.from('products').select('*')
        .eq('active', active === 'true' ? true : undefined as any)
        .ilike('category', category)
        .order('created_at', { ascending: false })
      
      if (!exactQuery.error && exactQuery.data && exactQuery.data.length > 0) {
        return NextResponse.json(exactQuery.data)
      }
      
      // Fallback: search by keywords in name
      const orConditions = keywords.slice(0, 6).map(kw => `name.ilike.%${kw}%`).join(',')
      query = query.or(orConditions)
    } else {
      query = query.ilike('category', `%${category}%`)
    }
  }

  if (search) query = query.ilike('name', `%${search}%`)
  if (exclude) query = query.neq('id', exclude)
  if (limit) query = query.limit(parseInt(limit))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
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
    cj_id: body.cj_id || '',
  }]).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
