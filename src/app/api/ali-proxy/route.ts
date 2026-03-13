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
    return NextResponse.json({ error: 'No se encontró el ID del producto. La URL debe contener el número de producto de AliExpress.' }, { status: 400 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY no configurada' }, { status: 500 })
  }

  // Try Item Detail endpoints in order
  const endpoints = [
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${productId}&currency=MXN&locale=es_MX`,
    `https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=${productId}&currency=MXN&locale=es_MX`,
    `https://aliexpress-datahub.p.rapidapi.com/item_detail?itemId=${productId}&currency=MXN&locale=es_MX`,
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

      if (!res.ok) {
        lastError = `${res.status}`
        continue
      }

      const data = await res.json()

      // Parse the response — different endpoints have different structures
      const result = data?.result || data
      const item = result?.item || result?.data || result

      // Extract title
      const title = item?.title || item?.subject || item?.ae_item_base_info_dto?.subject || ''

      // Extract price (in MXN)
      const priceInfo = item?.sku?.def?.prices || item?.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o
      let price = 0

      // Try various price paths
      const priceStr = item?.sale_price 
        || item?.sku?.def?.price 
        || item?.original_price
        || item?.ae_item_base_info_dto?.sale_price
        || ''
      
      if (priceStr) {
        price = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''))
      }

      // If no MXN price, try USD and convert (approx 17x)
      if (!price || price <= 0) {
        const usdStr = item?.usd_price || item?.sku?.def?.usd_price || ''
        if (usdStr) price = parseFloat(String(usdStr).replace(/[^0-9.]/g, '')) * 17
      }

      // Extract images
      const images: string[] = []
      const imgList = item?.image?.img_path_list 
        || item?.ae_multimedia_info_dto?.image_urls
        || item?.images
        || []

      if (Array.isArray(imgList)) {
        imgList.slice(0, 6).forEach((img: string) => {
          const u = img.startsWith('//') ? 'https:' + img : img.replace('http://', 'https://')
          if (u) images.push(u)
        })
      }

      // Fallback single image
      if (images.length === 0) {
        const mainImg = item?.image?.img_path || item?.main_image || ''
        if (mainImg) images.push(mainImg.startsWith('//') ? 'https:' + mainImg : mainImg)
      }

      if (!title) {
        lastError = 'No se encontró título en la respuesta'
        continue
      }

      return NextResponse.json({
        success: true,
        productId,
        raw: { title, price, currency: 'MXN', images }
      })

    } catch (e: any) {
      lastError = e.message
    }
  }

  return NextResponse.json({ 
    error: `No se pudo obtener el producto: ${lastError}`,
    productId 
  }, { status: 500 })
}
