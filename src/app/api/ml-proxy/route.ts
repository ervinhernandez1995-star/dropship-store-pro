import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const mlUrl = `https://api.mercadolibre.com${path}`
  try {
    const res = await fetch(mlUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-MX,es;q=0.9',
        'Referer': 'https://www.mercadolibre.com.mx/',
      },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
