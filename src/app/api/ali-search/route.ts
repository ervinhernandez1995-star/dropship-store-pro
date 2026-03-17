import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40)
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })

  // Try multiple search endpoints — item_detail_2 and item_detail_6 are confirmed working
  const searchEndpoints = [
    `https://aliexpress-datahub.p.rapidapi.com/item_search_2?keywords=${encodeURIComponent(q)}&page=1&sort=default`,
    `https://aliexpress-datahub.p.rapidapi.com/item_search?keywords=${encodeURIComponent(q)}&page=1`,
    `https://aliexpress-datahub.p.rapidapi.com/item_search_3?keywords=${encodeURIComponent(q)}&page=1`,
  ]

  const headers = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com' }

  for (const endpoint of searchEndpoints) {
    try {
      const res = await fetch(endpoint, { headers, cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()

      // Check for error status in response body
      if (data?.result?.status?.data === 'error') continue

      // Try multiple result paths
      const items: any[] = 
        data?.result?.resultList ||
        data?.result?.items ||
        data?.result?.data?.resultList ||
        data?.items || []

      if (items.length === 0) continue

      const ids: string[] = []
      const previews: any[] = []

      for (const item of items.slice(0, limit)) {
        // Different endpoints use different structures
        const id = String(
          item?.item?.itemId || item?.itemId || item?.id || 
          item?.product?.itemId || ''
        )
        if (!id || id === 'undefined') continue

        const title = item?.item?.title || item?.title || item?.product?.title || ''
        const image = item?.item?.image || item?.image || item?.product?.image || ''
        
        // Price from sku or direct
        const skuBase = item?.item?.sku?.base || []
        let price = 0
        if (skuBase.length > 0) {
          const promos = skuBase.map((s: any) => s.promotionPrice).filter((p: any) => p > 0)
          const regs = skuBase.map((s: any) => s.price).filter((p: any) => p > 0)
          price = promos.length > 0 ? Math.min(...promos) : regs.length > 0 ? Math.min(...regs) : 0
        }
        if (!price) {
          const defPrice = String(item?.item?.sku?.def?.price || item?.price || '0')
          price = parseFloat(defPrice.split('-')[0].replace(/[^0-9.]/g, '')) || 0
        }

        ids.push(id)
        previews.push({ id, title, price, image })
      }

      if (ids.length > 0) {
        return NextResponse.json({ ids, previews, total: ids.length, query: q, endpoint: endpoint.split('?')[0].split('/').pop() })
      }
    } catch { continue }
  }

  return NextResponse.json({ error: `No se encontraron productos para "${q}". Intenta con palabras en inglés (ej: bluetooth speaker, gaming mouse)`, ids: [], total: 0 }, { status: 404 })
}
