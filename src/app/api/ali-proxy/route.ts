import { NextRequest, NextResponse } from 'next/server'

function extractAliId(url: string): string | null {
  const m1 = url.match(/\/item\/(\d+)\.html/)
  if (m1) return m1[1]
  const m2 = url.match(/\/i\/(\d+)\.html/)
  if (m2) return m2[1]
  const m3 = url.match(/productId=(\d+)/)
  if (m3) return m3[1]
  const m4 = url.match(/(\d{10,})/)
  if (m4) return m4[1]
  return null
}

function parsePrice(val: any): number {
  if (!val) return 0
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  const productId = extractAliId(url)

  if (!productId) {
    return NextResponse.json({ error: 'No se encontró el ID del producto.' }, { status: 400 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY no configurada' }, { status: 500 })
  }

  const endpoints = [
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${productId}&currency=MXN&locale=es_MX`,
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_6?itemId=${productId}&currency=MXN&locale=es_MX`,
  ]

  let lastError = ''
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
        },
        cache: 'no-store',
      })

      if (!res.ok) { lastError = `${res.status}`; continue }

      const data = await res.json()
      const item = data?.result?.item
      if (!item) { lastError = 'no item'; continue }

      const title = item.title || ''
      if (!title) { lastError = 'no title'; continue }

      // Price from sku.base — use minimum promotionPrice
      const skuBase: any[] = item?.sku?.base || []
      let price = 0

      if (skuBase.length > 0) {
        const promos = skuBase.map((s: any) => s.promotionPrice).filter((p: any) => p != null && p > 0).map((p: any) => parseFloat(p))
        const regs = skuBase.map((s: any) => s.price).filter((p: any) => p != null && p > 0).map((p: any) => parseFloat(p))
        if (promos.length > 0) price = Math.min(...promos)
        else if (regs.length > 0) price = Math.min(...regs)
      }

      if (!price && item?.sku?.def?.price) {
        const defPrice = String(item.sku.def.price)
        const parts = defPrice.split('-').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
        if (parts.length > 0) price = Math.min(...parts)
      }

      const images: string[] = (item.images || []).slice(0, 6).map((img: string) =>
        img.startsWith('//') ? 'https:' + img : img.replace('http://', 'https://')
      )

      const response = NextResponse.json({
        success: true,
        productId,
        raw: { title, price: Math.round(price * 100) / 100, currency: 'MXN', images }
      })
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response

    } catch (e: any) { lastError = e.message }
  }

  return NextResponse.json({ error: `No se pudo obtener el producto: ${lastError}`, productId }, { status: 500 })
}
