import { NextRequest, NextResponse } from 'next/server'
import { cjFetch } from '@/lib/cj'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pid = searchParams.get('pid') || ''

  if (!pid) {
    return NextResponse.json({ error: 'pid requerido' }, { status: 400, headers: cors })
  }

  try {
    const data = await cjFetch(`/product/query?pid=${pid}`)

    if (!data.result || !data.data) {
      return NextResponse.json({ error: data.message || 'Producto no encontrado' }, { status: 404, headers: cors })
    }

    const p = data.data
    const images = (p.productImageSet || '')
      .split(',')
      .filter(Boolean)
      .concat([p.productImage].filter(Boolean))
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
      .slice(0, 8)

    return NextResponse.json({
      success: true,
      raw: {
        cj_id: p.pid,
        title: p.productNameEn,
        title_es: p.productName || p.productNameEn,
        price: parseFloat(p.sellPrice || p.productPrice || '0'),
        images,
        description: p.description || '',
        category: p.categoryName || 'General',
        variants: p.variants || [],
        weight: p.productWeight,
        source: 'CJDropshipping',
        source_url: `https://cjdropshipping.com/product/${p.pid}.html`,
      }
    }, { headers: cors })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
