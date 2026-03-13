import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const mlUrl = `https://api.mercadolibre.com${path}`
  const token = process.env.ML_ACCESS_TOKEN

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(mlUrl, { headers, cache: 'no-store' })
    const data = await res.json()

    // If token expired, signal the frontend
    if (res.status === 401 || (data.message === 'invalid_token')) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED', needsAuth: true }, { status: 401 })
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
