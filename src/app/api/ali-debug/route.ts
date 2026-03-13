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
  
  const result = data?.result || {}
  const item = result?.item || result?.data || {}
  const sku = item?.sku || {}

  return NextResponse.json({
    status: res.status,
    result_keys: Object.keys(result),
    item_keys: Object.keys(item),
    sku_keys: Object.keys(sku),
    sku_def: sku?.def || {},
    sku_props: sku?.props || [],
    result_sample: JSON.stringify(result).slice(0, 4000)
  })
}
