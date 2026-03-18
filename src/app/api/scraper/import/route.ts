import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { products } = await req.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de productos' }, { status: 400 })
    }

    // Limpiar campos que no existen en el schema de Supabase
    const cleanProducts = products.map((p: Record<string, unknown>) => {
      const { _keywords, ...rest } = p
      void _keywords // ignorar keywords (no están en el schema)

      return {
        name: String(rest.name ?? 'Sin nombre').slice(0, 255),
        description: String(rest.description ?? ''),
        price: Number(rest.price) || 0,
        cost_price: Number(rest.cost_price) || 0,
        stock: Number(rest.stock) || 100,
        category: String(rest.category ?? 'General'),
        images: Array.isArray(rest.images) ? rest.images : [],
        source_url: String(rest.source_url ?? ''),
        source_name: String(rest.source_name ?? 'AliExpress'),
        active: Boolean(rest.active ?? true),
        sold: Number(rest.sold) || 0,
      }
    })

    const { data, error } = await supabase
      .from('products')
      .insert(cleanProducts)
      .select('id, name, price')

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Error guardando en base de datos', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: data?.length ?? 0,
      products: data,
    })

  } catch (error) {
    console.error('Error importando productos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
