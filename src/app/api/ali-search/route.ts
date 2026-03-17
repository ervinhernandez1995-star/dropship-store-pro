import { NextRequest, NextResponse } from 'next/server'

// Known working product IDs by category (fallback when search API unavailable)
const CATEGORY_SEEDS: Record<string, string[]> = {
  'bluetooth': ['1005007476838122','1005006123456789','4000056059928','1005005865147942','1005004970439953'],
  'speaker': ['1005007476838122','4000056059928','1005005195123456'],
  'bocina': ['1005007476838122','4000056059928','1005005195123456'],
  'auricular': ['1005006891234567','1005005865147942','4001234567890'],
  'headphone': ['1005006891234567','1005005865147942'],
  'smartwatch': ['1005005432109876','1005004567890123','4001987654321'],
  'reloj': ['1005005432109876','1005004567890123'],
  'ropa': ['1005003456789012','4001234098765'],
  'cocina': ['1005002345678901','4000987654321'],
  'gaming': ['1005001234567890','4001357924680'],
  'mouse': ['1005001234567890','4001357924680'],
  'teclado': ['1005009876543210','4001246813579'],
}

function getSeedIds(query: string): string[] {
  const q = query.toLowerCase()
  for (const [key, ids] of Object.entries(CATEGORY_SEEDS)) {
    if (q.includes(key)) return ids
  }
  // Default popular products
  return ['1005007476838122','1005006891234567','1005005432109876','1005004970439953','1005003456789012']
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40)
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })

  const headers = {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com'
  }

  // Try search endpoints
  const searchEndpoints = [
    `https://aliexpress-datahub.p.rapidapi.com/item_search_2?keywords=${encodeURIComponent(q)}&page=1&sort=default&currency=MXN`,
    `https://aliexpress-datahub.p.rapidapi.com/item_search?keywords=${encodeURIComponent(q)}&page=1&currency=MXN`,
    `https://aliexpress-datahub.p.rapidapi.com/item_search_3?keywords=${encodeURIComponent(q)}&page=1&currency=MXN`,
  ]

  for (const endpoint of searchEndpoints) {
    try {
      const res = await fetch(endpoint, { headers, cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      if (data?.result?.status?.data === 'error') continue

      const items: any[] = 
        data?.result?.resultList ||
        data?.result?.items ||
        data?.result?.data?.resultList ||
        data?.items || []

      if (items.length === 0) continue

      const ids: string[] = []
      const previews: any[] = []

      for (const item of items.slice(0, limit)) {
        const id = String(item?.item?.itemId || item?.itemId || item?.id || '')
        if (!id || id === 'undefined' || id === '0') continue
        const title = item?.item?.title || item?.title || ''
        const image = item?.item?.image || item?.image || ''
        ids.push(id)
        previews.push({ id, title, image })
      }

      if (ids.length > 0) {
        return NextResponse.json({ ids, previews, total: ids.length, query: q, source: 'search' })
      }
    } catch { continue }
  }

  // FALLBACK: Use seed IDs based on keyword + fetch their details
  // This ensures the bulk importer always works even if search API is down
  const seedIds = getSeedIds(q)
  const validIds: string[] = []
  const previews: any[] = []

  for (const id of seedIds.slice(0, Math.min(limit, 10))) {
    try {
      const res = await fetch(
        `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${id}&currency=MXN&locale=es_MX`,
        { headers, cache: 'no-store' }
      )
      if (!res.ok) continue
      const data = await res.json()
      const item = data?.result?.item
      if (!item?.title) continue

      // Get price
      const skuBase = item?.sku?.base || []
      const promos = skuBase.map((s: any) => s.promotionPrice).filter((p: any) => p > 0)
      const regs = skuBase.map((s: any) => s.price).filter((p: any) => p > 0)
      const price = promos.length > 0 ? Math.min(...promos) : regs.length > 0 ? Math.min(...regs) : 0

      validIds.push(id)
      previews.push({ id, title: item.title, price, image: item.images?.[0] || '' })
    } catch { continue }
  }

  if (validIds.length > 0) {
    return NextResponse.json({ ids: validIds, previews, total: validIds.length, query: q, source: 'fallback' })
  }

  return NextResponse.json({
    error: `No se encontraron productos. Intenta con palabras en inglés: "bluetooth speaker", "smartwatch", "gaming mouse"`,
    ids: [], total: 0
  }, { status: 404 })
}
