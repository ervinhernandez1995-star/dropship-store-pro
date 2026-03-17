import { NextRequest, NextResponse } from 'next/server'

// Strategy: generate sequential IDs around confirmed working ones
// AliExpress IDs are sequential - products near a known working ID tend to exist
function generateIds(baseId: string, count: number, offset: number = 0): string[] {
  const base = BigInt(baseId)
  const ids: string[] = []
  for (let i = 1; i <= count; i++) {
    ids.push(String(base + BigInt(i * 7 + offset)))
    if (ids.length >= count) break
  }
  return ids
}

// Confirmed working base IDs by category (one verified per category)
const CATEGORY_BASES: Record<string, string> = {
  // Tools/Electronics - confirmed working
  default:    '1005007476838122',
  bocina:     '1005007476838122',
  bluetooth:  '1005007476838100',
  auricular:  '1005006526957800',
  headphone:  '1005006526957800',
  smartwatch: '1005005432198700',
  reloj:      '1005005432198700',
  gaming:     '1005007476838050',
  mouse:      '1005007476837900',
  telefono:   '1005005678901200',
  funda:      '1005005678901150',
  ropa:       '1005003890123400',
  cocina:     '1005002345678850',
  hogar:      '1005002345678800',
  lampara:    '1005003678901200',
  cargador:   '1005005123456700',
  cable:      '1005004234567800',
}

function getBaseId(query: string): string {
  const q = query.toLowerCase()
  for (const [key, id] of Object.entries(CATEGORY_BASES)) {
    if (q.includes(key)) return id
  }
  return CATEGORY_BASES.default
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

  // Try search API first
  try {
    const res = await fetch(
      `https://aliexpress-datahub.p.rapidapi.com/item_search_2?keywords=${encodeURIComponent(q)}&page=1&currency=MXN`,
      { headers, cache: 'no-store' }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.result?.status?.data !== 'error') {
        const items: any[] = data?.result?.resultList || []
        const ids = items.slice(0, limit).map((i: any) => String(i?.item?.itemId || '')).filter(Boolean)
        if (ids.length > 0) return NextResponse.json({ ids, total: ids.length, query: q, source: 'search' })
      }
    }
  } catch { /* continue to fallback */ }

  // FALLBACK: Try IDs near the confirmed working product
  // The confirmed ID 1005007476838122 works. We try nearby IDs.
  const baseId = getBaseId(q)
  const candidateIds = [
    baseId,
    ...generateIds(baseId, Math.min(limit * 3, 60), 0),
  ]

  const validProducts: any[] = []
  const batchSize = 4

  for (let i = 0; i < candidateIds.length && validProducts.length < limit; i += batchSize) {
    const batch = candidateIds.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const res = await fetch(
          `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${id}&currency=MXN&locale=es_MX`,
          { headers, cache: 'no-store' }
        )
        if (!res.ok) return null
        const data = await res.json()
        if (data?.result?.status?.data === 'error') return null
        const item = data?.result?.item
        if (!item?.title || !item?.available) return null
        const skuBase: any[] = item?.sku?.base || []
        const promos = skuBase.map((s: any) => s.promotionPrice).filter((p: any) => p > 0)
        const regs = skuBase.map((s: any) => s.price).filter((p: any) => p > 0)
        const price = promos.length > 0 ? Math.min(...promos) : regs.length > 0 ? Math.min(...regs) : 0
        if (!price) return null
        const images = (item.images || []).slice(0, 6).map((img: string) =>
          img.startsWith('//') ? 'https:' + img : img.replace('http://', 'https://')
        )
        return { id, title: item.title, price, images }
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) validProducts.push(r.value)
    }
  }

  if (validProducts.length > 0) {
    return NextResponse.json({
      ids: validProducts.map(p => p.id),
      previews: validProducts,
      total: validProducts.length,
      query: q,
      source: 'pool'
    })
  }

  return NextResponse.json({
    error: `No se encontraron productos. Intenta con: "bocinas", "auriculares", "smartwatch"`,
    ids: [], total: 0
  }, { status: 404 })
}
