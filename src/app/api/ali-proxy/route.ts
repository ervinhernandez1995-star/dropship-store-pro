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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  const debug = searchParams.get('debug') === '1'
  const productId = extractAliId(url)

  if (!productId) {
    return NextResponse.json({ error: 'No se encontró el ID del producto.' }, { status: 400 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) return NextResponse.json({ error: 'RAPIDAPI_KEY no configurada' }, { status: 500 })

  // Try endpoints — request USD so we can convert reliably, or MXN if available
  const endpoints = [
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${productId}&currency=MXN&locale=es_MX`,
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${productId}&currency=MXN&locale=es_MX`,
    `https://aliexpress-datahub.p.rapidapi.com/item_detail?itemId=${productId}&currency=USD&locale=es_MX`,
  ]

  let lastError = ''
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i]
    const isUSD = endpoint.includes('currency=USD')
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
      if (debug) return NextResponse.json(data)

      const result = data?.result || data
      const item = result?.item || result?.data || result

      const title = item?.title || item?.subject || item?.ae_item_base_info_dto?.subject || ''
      if (!title) { lastError = 'no title'; continue }

      // ── Price extraction ──
      // item_detail_3 / item_detail_2 structure:
      // item.sku.def.prices.salePrice.formattedPrice = "MX$677.17"
      // item.sku.def.prices.salePrice.minPrice (number, in requested currency)
      let price = 0

      const skuPrices = item?.sku?.def?.prices
      if (skuPrices) {
        // Try salePrice first, then originalPrice
        const salePriceFormatted = skuPrices?.salePrice?.formattedPrice || skuPrices?.minActivityAmount?.formattedPrice || ''
        const salePriceNum = skuPrices?.salePrice?.minPrice || skuPrices?.salePrice?.minAmount?.value || 0
        
        if (salePriceFormatted) {
          price = parsePrice(salePriceFormatted)
        } else if (salePriceNum) {
          price = parseFloat(salePriceNum)
        }
      }

      // Fallback paths
      if (!price) price = parsePrice(item?.sale_price || item?.sku?.def?.price || item?.ae_item_base_info_dto?.sale_price || 0)
      
      // If USD, convert to MXN (approximate)
      if (!price && isUSD) {
        const usdPrice = parsePrice(item?.sku?.def?.prices?.salePrice?.minPrice || item?.sale_price || 0)
        if (usdPrice > 0) price = Math.round(usdPrice * 17.5)
      }

      // ── Images ──
      const images: string[] = []
      const imgList = item?.image?.img_path_list
        || item?.imagePathList
        || item?.ae_multimedia_info_dto?.image_urls
        || item?.images || []

      if (Array.isArray(imgList)) {
        imgList.slice(0, 6).forEach((img: string) => {
          if (!img) return
          const u = img.startsWith('//') ? 'https:' + img : img.replace('http://', 'https://')
          images.push(u)
        })
      }
      if (images.length === 0) {
        const main = item?.image?.img_path || item?.mainImage || ''
        if (main) images.push(main.startsWith('//') ? 'https:' + main : main)
      }

      // ── Description ──
      const description = item?.description || item?.detail || ''

      return NextResponse.json({
        success: true,
        productId,
        raw: { title, price, currency: isUSD ? 'USD_converted' : 'MXN', images, description }
      })

    } catch (e: any) { lastError = e.message }
  }

  return NextResponse.json({ error: `No se pudo obtener el producto: ${lastError}`, productId }, { status: 500 })
}
