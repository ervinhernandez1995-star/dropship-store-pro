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
  const keyword = searchParams.get('keyword') || ''
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '20'

  if (!keyword) {
    return NextResponse.json({ error: 'keyword requerida' }, { status: 400, headers: cors })
  }

  try {
    const data = await cjFetch(
      `/product/list?productNameEn=${encodeURIComponent(keyword)}&pageNum=${page}&pageSize=${limit}`
    )

    if (!data.result) {
      return NextResponse.json({ error: data.message }, { status: 400, headers: cors })
    }

    // Normalize products
    const products = (data.data?.list || []).map((p: any) => ({
      cj_id: p.pid,
      title: p.productNameEn,
      title_es: p.productName || p.productNameEn,
      price: parseFloat(p.sellPrice || p.productPrice || '0'),
      image: p.productImage || '',
      images: p.productImageSet?.split(',').filter(Boolean) || [p.productImage].filter(Boolean),
      category: p.categoryName || 'General',
      variants: p.variants || [],
      source: 'CJDropshipping',
    }))

    return NextResponse.json({
      success: true,
      products,
      total: data.data?.total || products.length,
      page: parseInt(page),
    }, { headers: cors })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
