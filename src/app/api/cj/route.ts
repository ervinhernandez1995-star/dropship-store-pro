import { NextRequest, NextResponse } from 'next/server'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

let tokenCache: { token: string; expires: number } | null = null

async function getCJToken(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY
  if (!apiKey) throw new Error('CJ_API_KEY no configurada')
  if (tokenCache && tokenCache.expires > Date.now() + 3600000) return tokenCache.token

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })
  const data = await res.json()
  if (!data.result || !data.data?.accessToken) throw new Error('CJ auth failed: ' + (data.message || JSON.stringify(data)))
  tokenCache = { token: data.data.accessToken, expires: new Date(data.data.accessTokenExpiryDate).getTime() }
  return data.data.accessToken
}

function parseImages(p: any): string[] {
  const imgs: string[] = []
  const seen = new Set<string>()

  const add = (url: string) => {
    const clean = url.trim().replace('http://', 'https://')
    if (!clean || seen.has(clean) || !clean.startsWith('https://')) return
    seen.add(clean)
    imgs.push(clean)
  }

  // 1. productImageSet (comma-separated) — main source for detail endpoint
  if (p.productImageSet) p.productImageSet.split(',').forEach((u: string) => add(u.trim()))

  // 2. Single image fields
  if (p.productImage) add(p.productImage)
  if (p.productImgUrl) add(p.productImgUrl)

  // 3. Extract images from remark HTML — this is where CJ hides extra product photos!
  // remark contains: <img src="https://oss-cf.cjdropshipping.com/..." />
  if (p.remark) {
    const remarkImgs = [...p.remark.matchAll(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))[^"']*/gi)]
    remarkImgs.forEach((m: any) => add(m[1]))
  }

  // 4. Variant images
  ;(p.variantList || p.variants || []).forEach((v: any) => { if (v.variantImage) add(v.variantImage) })

  return imgs.slice(0, 8)
}

function isChinese(t: string): boolean {
  return /[\u4e00-\u9fff]/.test(t || '')
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'search'

  try {
    const token = await getCJToken()

    // ── DEBUG: see raw CJ response ────────────────────────────────
    if (action === 'debug') {
      const q = searchParams.get('q') || 'smartwatch'
      const raw = await fetch(`${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(q)}&pageNum=1&pageSize=3`, {
        headers: { 'CJ-Access-Token': token }
      })
      const data = await raw.json()
      return NextResponse.json({ raw: data, firstProduct: data.data?.list?.[0] }, { headers: cors })
    }

    // ── SEARCH ────────────────────────────────────────────────────
    if (action === 'search') {
      const query = searchParams.get('q') || ''
      const limit = parseInt(searchParams.get('limit') || '20')

      // CJ needs English keywords — expand query into related terms
      const keywordMap: Record<string, string[]> = {
        'smart watch': ['smart watch', 'smartwatch', 'fitness watch', 'sport watch'],
        'smartwatch': ['smartwatch', 'smart watch', 'fitness watch', 'sport watch'],
        'bluetooth speaker': ['bluetooth speaker', 'wireless speaker', 'portable speaker'],
        'tws earbuds': ['tws earbuds', 'wireless earbuds', 'bluetooth earphones', 'earphones'],
        'phone case': ['phone case', 'mobile phone case', 'iphone case'],
        'led light': ['led light', 'led strip', 'led lamp'],
        'gaming': ['gaming mouse', 'gaming keyboard', 'gaming accessories'],
        'kitchen': ['kitchen gadgets', 'kitchen tools', 'kitchen accessories'],
        'sport clothing': ['sport clothing', 'gym wear', 'sportswear'],
      }

      const queryLower = query.toLowerCase()
      let keywords: string[] = []
      for (const [key, vals] of Object.entries(keywordMap)) {
        if (queryLower.includes(key) || key.includes(queryLower)) {
          keywords = vals
          break
        }
      }
      if (keywords.length === 0) keywords = [query]

      // Fetch from multiple keywords and combine
      const allProducts: any[] = []
      const seenPids = new Set<string>()

      for (const kw of keywords) {
        if (allProducts.length >= limit * 2) break
        try {
          const r = await fetch(
            `${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(kw)}&pageNum=1&pageSize=${limit}`,
            { headers: { 'CJ-Access-Token': token } }
          )
          const d = await r.json()
          if (d.result && d.data?.list) {
            d.data.list.forEach((p: any) => {
              if (!seenPids.has(p.pid)) {
                seenPids.add(p.pid)
                allProducts.push(p)
              }
            })
          }
        } catch { /* skip failed keyword */ }
        await new Promise(r => setTimeout(r, 100))
      }

      // Shuffle for variety
      for (let i = allProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]]
      }

      const products = allProducts.slice(0, limit).map((p: any) => {
        const images = parseImages(p)
        return {
          id: p.pid,
          cj_id: p.pid,
          title: isChinese(p.productNameEn) ? (p.productName || p.productNameEn) : (p.productNameEn || p.productName),
          titleEs: isChinese(p.productName) ? p.productNameEn : (p.productName || p.productNameEn),
          price: parseFloat(p.sellPrice || p.productPrice || p.salePrice || p.channelPrice || '0'),
          image: images[0] || '',
          images,
          category: p.categoryName || '',
          stock: 999,
          source_url: `https://cjdropshipping.com/product/-p-${p.pid}.html`,
        }
      })

      return NextResponse.json({ success: true, products, total: products.length }, { headers: cors })
    }

    // ── DETAIL ────────────────────────────────────────────────────
    if (action === 'detail') {
      const pid = searchParams.get('pid')
      if (!pid) return NextResponse.json({ error: 'pid requerido' }, { status: 400, headers: cors })

      const res = await fetch(`${CJ_BASE}/product/query?pid=${pid}`, {
        headers: { 'CJ-Access-Token': token }
      })
      const data = await res.json()
      if (!data.result) throw new Error(data.message || 'Product not found')

      const p = data.data
      const images = parseImages(p)

      return NextResponse.json({
        success: true,
        product: {
          id: p.pid,
          cj_id: p.pid,
          title: isChinese(p.productNameEn) ? (p.productName || p.productNameEn) : (p.productNameEn || p.productName),
          titleEs: p.productName || p.productNameEn,
          price: parseFloat(p.sellPrice || p.productPrice || p.salePrice || p.channelPrice || '0'),
          images,
          description: p.description || '',
          category: p.categoryName || '',
          source_url: `https://cjdropshipping.com/product/-p-${p.pid}.html`,
          // Return raw data for debugging
          _raw_imageSet: p.productImageSet || '',
          _raw_image: p.productImage || '',
        }
      }, { headers: cors })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400, headers: cors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  try {
    const token = await getCJToken()

    if (action === 'createOrder') {
      const { orderNumber, shippingAddress, products } = body
      const res = await fetch(`${CJ_BASE}/shopping/order/createOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
        body: JSON.stringify({
          orderNumber,
          shippingZip: shippingAddress.zip,
          shippingCountryCode: 'MX',
          shippingCountry: 'Mexico',
          shippingProvince: shippingAddress.state,
          shippingCity: shippingAddress.city,
          shippingAddress: shippingAddress.address,
          shippingCustomerName: shippingAddress.name,
          shippingPhone: shippingAddress.phone,
          products: products.map((p: any) => ({ vid: p.variant_id || p.cj_id, quantity: p.quantity || 1 }))
        })
      })
      const data = await res.json()
      return NextResponse.json({ success: data.result, data: data.data, message: data.message }, { headers: cors })
    }

    if (action === 'getShipping') {
      const { pid, quantity = 1 } = body
      const res = await fetch(`${CJ_BASE}/logistic/freightCalculate?startCountryCode=CN&endCountryCode=MX&pid=${pid}&quantity=${quantity}`,
        { headers: { 'CJ-Access-Token': token } })
      const data = await res.json()
      return NextResponse.json({ success: data.result, shipping: data.data }, { headers: cors })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400, headers: cors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
