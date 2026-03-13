import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('id') || '1005007476838122'
  const apiKey = process.env.RAPIDAPI_KEY!

  const res = await fetch(
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${itemId}&currency=MXN&locale=es_MX`,
    { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com' }, cache: 'no-store' }
  )
  const data = await res.json()
  
  // Extract just the price-related fields so it's easy to read
  const item = data?.result?.item || data?.item || data
  const sku = item?.sku || {}
  
  return NextResponse.json({
    status: res.status,
    sku_def: sku?.def || {},
    sku_base: sku?.base || sku?.skus || [],
    item_prices: Object.fromEntries(
      Object.entries(item || {}).filter(([k]) => k.toLowerCase().includes('price') || k.toLowerCase().includes('sale') || k.toLowerCase().includes('amount'))
    ),
    full_item_keys: Object.keys(item || {})
  })
}
