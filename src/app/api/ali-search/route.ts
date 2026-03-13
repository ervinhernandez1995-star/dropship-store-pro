import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40)

  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })

  try {
    // Search AliExpress items via RapidAPI
    const res = await fetch(
      `https://aliexpress-datahub.p.rapidapi.com/item_search_2?keywords=${encodeURIComponent(q)}&page=1&sort=default&locale=es_MX&currency=MXN`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `RapidAPI error ${res.status}: ${err.slice(0, 200)}` }, { status: res.status })
    }

    const data = await res.json()

    // Extract item IDs and basic info from search results
    const items = data?.result?.resultList || data?.result?.items || data?.items || []
    
    const ids: string[] = []
    const previews: any[] = []

    for (const item of items.slice(0, limit)) {
      const id = item?.item?.itemId || item?.itemId || item?.id
      const title = item?.item?.title || item?.title
      const price = item?.item?.sku?.def?.prices?.salePrice?.minAmount?.value
        || item?.item?.sku?.def?.price
        || item?.price
        || 0
      const image = item?.item?.image || item?.image || ''

      if (id) {
        ids.push(String(id))
        previews.push({ id: String(id), title, price, image })
      }
    }

    return NextResponse.json({ ids, previews, total: ids.length, query: q })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
