import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('id') || '1005007476838122'
  const apiKey = process.env.RAPIDAPI_KEY!

  const res = await fetch(
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${itemId}&currency=MXN&locale=es_MX`,
    { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com' }, cache: 'no-store' }
  )
  const data = await res.json()
  const item = data?.result?.item || {}
  const sku = item?.sku || {}

  return NextResponse.json({
    sku_keys: Object.keys(sku),
    sku_def: sku?.def || {},
    sku_base: Array.isArray(sku?.base) ? sku.base.slice(0,2) : sku?.base,
    sku_props: sku?.props || [],
    item_price_fields: Object.fromEntries(
      Object.entries(item).filter(([k]) => k.toLowerCase().includes('price') || k.toLowerCase().includes('sale'))
    )
  })
}
