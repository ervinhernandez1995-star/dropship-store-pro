import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('id') || '1005007476838122'
  const apiKey = process.env.RAPIDAPI_KEY!

  const endpoints = [
    'item_detail_2',
    'item_detail',
    'item_detail_6',
  ]

  const results: any = {}

  for (const ep of endpoints) {
    try {
      const res = await fetch(
        `https://aliexpress-datahub.p.rapidapi.com/${ep}?itemId=${itemId}&currency=MXN&locale=es_MX`,
        { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com' }, cache: 'no-store' }
      )
      const data = await res.json()
      const sample = JSON.stringify(data).slice(0, 2000)
      results[ep] = { status: res.status, sample }
    } catch (e: any) {
      results[ep] = { error: e.message }
    }
  }

  return NextResponse.json(results)
}
