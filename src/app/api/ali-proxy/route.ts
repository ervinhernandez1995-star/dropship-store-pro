import { NextRequest, NextResponse } from 'next/server'

function extractAliId(url: string): string | null {
  // https://www.aliexpress.com/item/1005006123456789.html
  const m1 = url.match(/\/item\/(\d+)\.html/)
  if (m1) return m1[1]
  // https://aliexpress.com/i/1005006123456789.html
  const m2 = url.match(/\/i\/(\d+)\.html/)
  if (m2) return m2[1]
  // productId=123456789
  const m3 = url.match(/productId=(\d+)/)
  if (m3) return m3[1]
  // Any long number in path
  const m4 = url.match(/(\d{10,})/)
  if (m4) return m4[1]
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  const productId = searchParams.get('id') || extractAliId(url)
  
  if (!productId) return NextResponse.json({ error: 'No se encontró el ID del producto en la URL de AliExpress' }, { status: 400 })

  // Use the AliExpress DS API (no auth needed for basic product info)
  const endpoints = [
    `https://www.aliexpress.com/fn/search-pc/index?productId=${productId}&locale=es_MX&currency=MXN`,
    `https://aliexpress.ru/item/${productId}.html`,
  ]

  // Primary: Use AliExpress product page data API
  try {
    const res = await fetch(
      `https://www.aliexpress.com/item/${productId}.html`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.aliexpress.com/',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `AliExpress returned ${res.status}` }, { status: res.status })
    }

    const html = await res.text()

    // Extract data from the page's window.runParams JSON
    const dataMatch = html.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|let|const|<\/script)/)
    if (dataMatch) {
      try {
        const runParams = JSON.parse(dataMatch[1])
        const detail = runParams?.data?.productInfoComponent || runParams?.data
        const price = runParams?.data?.priceComponent || runParams?.data?.skuComponent
        const media = runParams?.data?.imageComponent || runParams?.data?.mediaComponent

        return NextResponse.json({
          success: true,
          productId,
          raw: {
            title: detail?.subject || detail?.title,
            price: price?.skuPriceList?.[0]?.skuVal?.skuAmount?.value 
              || price?.salePrice?.minAmount?.value
              || null,
            currency: 'MXN',
            images: media?.imagePathList || media?.images || [],
            description: detail?.description || '',
          }
        })
      } catch { /* fallback below */ }
    }

    // Fallback: extract basic info with regex
    const titleMatch = html.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/) 
      || html.match(/"subject":"([^"]+)"/)
      || html.match(/<title>([^|<]+)/)
    
    const priceMatch = html.match(/"formattedPrice":"([^"]+)"/)
      || html.match(/class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\$[\d,\.]+)/)
      || html.match(/"minAmount":\{"value":([\d.]+)/)

    const imgMatches = [...html.matchAll(/"imagePathList":\["([^"]+)"(?:,"([^"]+)")*\]/g)]
    const images: string[] = []
    const imgListMatch = html.match(/"imagePathList":\[([^\]]+)\]/)
    if (imgListMatch) {
      const urls = imgListMatch[1].match(/"([^"]+\.jpg[^"]*)"/g) || []
      urls.slice(0, 5).forEach(u => images.push(u.replace(/"/g, '').replace(/\\/g, '')))
    }

    const title = titleMatch ? titleMatch[1].trim() : null
    const priceRaw = priceMatch ? priceMatch[1] : null
    const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) : null

    return NextResponse.json({
      success: !!title,
      productId,
      raw: { title, price, currency: 'MXN', images, description: '' }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
