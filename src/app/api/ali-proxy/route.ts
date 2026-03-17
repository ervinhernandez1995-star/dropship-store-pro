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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  const productId = extractAliId(url)

  if (!productId) {
    const _r = NextResponse.json({ error: 'No se encontró el ID del producto.' }, { status: 400 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) const _r = NextResponse.json({ error: 'RAPIDAPI_KEY no configurada' }, { status: 500 })

  // item_detail_2 and item_detail_6 both work — try in order
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

      // ── Price: use minimum promotionPrice from sku.base, else minimum price ──
      // sku.base has one entry per variant (color/ship-from combo)
      // promotionPrice = discounted price (what customer sees)
      // price = original price before discount
      const skuBase: any[] = item?.sku?.base || []
      let price = 0

      if (skuBase.length > 0) {
        // Collect all valid promotion prices (skip nulls)
        const promoprices = skuBase
          .map((s: any) => s.promotionPrice)
          .filter((p: any) => p != null && p > 0)
          .map((p: any) => parseFloat(p))

        // Collect all regular prices
        const regularPrices = skuBase
          .map((s: any) => s.price)
          .filter((p: any) => p != null && p > 0)
          .map((p: any) => parseFloat(p))

        // Use lowest promo price if available, else lowest regular price
        if (promoprices.length > 0) {
          price = Math.min(...promoprices)
        } else if (regularPrices.length > 0) {
          price = Math.min(...regularPrices)
        }
      }

      // Fallback to sku.def price range (take the min)
      if (!price && item?.sku?.def?.price) {
        const defPrice = String(item.sku.def.price)
        const parts = defPrice.split('-').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
        if (parts.length > 0) price = Math.min(...parts)
      }

      // ── Images ──
      const images: string[] = (item.images || []).slice(0, 6).map((img: string) =>
        img.startsWith('//') ? 'https:' + img : img.replace('http://', 'https://')
      )

      const _r = NextResponse.json({
        success: true,
        productId,
        raw: { title, price: Math.round(price * 100) / 100, currency: 'MXN', images }
      })

    } catch (e: any) { lastError = e.message }
  }

  const _r = NextResponse.json({ error: `No se pudo obtener el producto: ${lastError}`, productId }, { status: 500 })
}
