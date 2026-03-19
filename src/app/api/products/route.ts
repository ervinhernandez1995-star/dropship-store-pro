import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Keywords for smart category matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Electrónica': ['auricular', 'headphone', 'bluetooth', 'smartwatch', 'reloj inteligente', 'bocina', 'speaker', 'cargador', 'cable', 'gaming', 'mouse', 'teclado', 'camara', 'led', 'electronic', 'phone', 'celular', 'tablet', 'laptop', 'earphone', 'earbuds', 'tws', 'inalambrico', 'wireless', 'usb', 'bateria', 'power bank'],
  'Moda': ['ropa', 'camisa', 'pantalon', 'vestido', 'zapato', 'tenis', 'bolsa', 'mochila', 'fashion', 'clothing', 'shirt', 'dress', 'shoe', 'pants', 'jacket', 'hoodie', 'sudadera', 'blusa', 'playera', 'legging', 'bikini', 'falda', 'accesorio moda', 'pulsera', 'collar', 'aretes'],
  'Hogar': ['hogar', 'cocina', 'lampara', 'silla', 'mesa', 'decoracion', 'cojin', 'cortina', 'home', 'kitchen', 'furniture', 'lamp', 'chair', 'table', 'alfombra', 'organizador', 'almohada', 'toalla', 'jarron', 'planta'],
  'Deportes': ['deporte', 'gym', 'fitness', 'yoga', 'correr', 'ciclismo', 'sport', 'exercise', 'workout', 'pesas', 'banda elastica', 'colchoneta', 'running'],
  'Belleza': ['belleza', 'maquillaje', 'crema', 'perfume', 'beauty', 'makeup', 'skincare', 'serum', 'labial', 'mascara', 'base maquillaje', 'bronceador', 'hidratante'],
  'Juguetes': ['juguete', 'niño', 'toy', 'game', 'puzzle', 'kids', 'infantil', 'bebe', 'peluche', 'figura', 'muñeca'],
  'Automotriz': ['auto', 'carro', 'vehiculo', 'car', 'automotive', 'motor', 'soporte celular carro', 'limpieza auto'],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')
  const search = searchParams.get('search')
  const admin = searchParams.get('admin')
  const limit = searchParams.get('limit')
  const exclude = searchParams.get('exclude')

  try {
    let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false })

    if (active === 'true' && !admin) query = query.eq('active', true)
    if (exclude) query = query.neq('id', exclude)
    if (limit) query = query.limit(parseInt(limit))

    if (search) {
      query = query.ilike('name', `%${search}%`)
    } else if (category && category !== 'Todos') {
      // Step 1: try exact category match
      const { data: exact } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('active', true)
        .ilike('category', category)
        .order('created_at', { ascending: false })
        .limit(limit ? parseInt(limit) : 100)

      if (exact && exact.length > 0) {
        return NextResponse.json(exact)
      }

      // Step 2: keyword search in product name
      const keywords = CATEGORY_KEYWORDS[category] || []
      if (keywords.length > 0) {
        // Build OR conditions for first 8 keywords (Supabase limit)
        const orParts = keywords.slice(0, 8).map(kw => `name.ilike.%${kw}%`)
        const { data: byKeyword } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('active', true)
          .or(orParts.join(','))
          .order('created_at', { ascending: false })
          .limit(limit ? parseInt(limit) : 100)

        if (byKeyword && byKeyword.length > 0) {
          return NextResponse.json(byKeyword)
        }

        // Step 3: try second batch of keywords
        if (keywords.length > 8) {
          const orParts2 = keywords.slice(8, 16).map(kw => `name.ilike.%${kw}%`)
          const { data: byKeyword2 } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('active', true)
            .or(orParts2.join(','))
            .order('created_at', { ascending: false })
            .limit(limit ? parseInt(limit) : 100)

          if (byKeyword2 && byKeyword2.length > 0) {
            return NextResponse.json(byKeyword2)
          }
        }
      }

      // Step 4: fallback — return all products
      const { data: all } = await supabaseAdmin
        .from('products').select('*').eq('active', true)
        .order('created_at', { ascending: false })
        .limit(limit ? parseInt(limit) : 100)
      return NextResponse.json(all || [])
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
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
