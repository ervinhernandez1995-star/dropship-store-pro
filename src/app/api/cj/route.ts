import { NextRequest, NextResponse } from 'next/server'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

// ── Token cache (in-memory for serverless) ──────────────────────
let tokenCache: { token: string; expires: number } | null = null

async function getCJToken(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY
  if (!apiKey) throw new Error('CJ_API_KEY no configurada')

  // Return cached token if still valid (with 1hr buffer)
  if (tokenCache && tokenCache.expires > Date.now() + 3600000) {
    return tokenCache.token
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })
  const data = await res.json()
  if (!data.result || !data.data?.accessToken) {
    throw new Error('CJ auth failed: ' + (data.message || JSON.stringify(data)))
  }

  const expiryDate = new Date(data.data.accessTokenExpiryDate).getTime()
  tokenCache = { token: data.data.accessToken, expires: expiryDate }
  return data.data.accessToken
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'search'

  try {
    const token = await getCJToken()

    // ── SEARCH PRODUCTS ──────────────────────────────────────────
    if (action === 'search') {
      const query = searchParams.get('q') || ''
      const page = searchParams.get('page') || '1'
      const limit = searchParams.get('limit') || '20'

      const res = await fetch(
        `${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(query)}&pageNum=${page}&pageSize=${limit}`,
        { headers: { 'CJ-Access-Token': token } }
      )
      const data = await res.json()
      if (!data.result) throw new Error(data.message)

      const products = (data.data?.list || []).map((p: any) => ({
        id: p.pid,
        title: p.productNameEn,
        titleEs: p.productName || p.productNameEn,
        price: parseFloat(p.sellPrice || p.productPrice || '0'),
        image: p.productImage || p.productImgUrl || '',
        images: p.productImageSet ? p.productImageSet.split(',') : [p.productImage].filter(Boolean),
        category: p.categoryName || '',
        stock: p.productWeight ? 999 : 50,
        source: 'CJDropshipping',
        source_url: `https://cjdropshipping.com/product/-p-${p.pid}.html`,
        cj_id: p.pid,
        variants: p.variants || [],
      }))

      return NextResponse.json({ success: true, products, total: data.data?.total || products.length }, { headers: cors })
    }

    // ── PRODUCT DETAIL ───────────────────────────────────────────
    if (action === 'detail') {
      const pid = searchParams.get('pid')
      if (!pid) return NextResponse.json({ error: 'pid requerido' }, { status: 400, headers: cors })

      const res = await fetch(`${CJ_BASE}/product/query?pid=${pid}`, {
        headers: { 'CJ-Access-Token': token }
      })
      const data = await res.json()
      if (!data.result) throw new Error(data.message)

      const p = data.data
      const images = p.productImageSet
        ? p.productImageSet.split(',').filter(Boolean)
        : [p.productImage].filter(Boolean)

      return NextResponse.json({
        success: true,
        product: {
          id: p.pid,
          title: p.productNameEn,
          titleEs: p.productName || p.productNameEn,
          price: parseFloat(p.sellPrice || p.productPrice || '0'),
          images,
          description: p.description || '',
          category: p.categoryName || '',
          variants: p.variants || [],
          source: 'CJDropshipping',
          source_url: `https://cjdropshipping.com/product/-p-${p.pid}.html`,
          cj_id: p.pid,
        }
      }, { headers: cors })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400, headers: cors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}

// ── CREATE ORDER ─────────────────────────────────────────────────
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
          products: products.map((p: any) => ({
            vid: p.variant_id || p.cj_id,
            quantity: p.quantity || 1,
          }))
        })
      })
      const data = await res.json()
      return NextResponse.json({ success: data.result, data: data.data, message: data.message }, { headers: cors })
    }

    if (action === 'getShipping') {
      const { pid, quantity = 1 } = body
      const res = await fetch(
        `${CJ_BASE}/logistic/freightCalculate?startCountryCode=CN&endCountryCode=MX&pid=${pid}&quantity=${quantity}`,
        { headers: { 'CJ-Access-Token': token } }
      )
      const data = await res.json()
      return NextResponse.json({ success: data.result, shipping: data.data }, { headers: cors })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400, headers: cors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
