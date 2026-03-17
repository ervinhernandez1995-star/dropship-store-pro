import { NextRequest, NextResponse } from 'next/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || 'bluetooth speaker'
  const apiKey = process.env.RAPIDAPI_KEY!
  const eps = ['item_search_2','item_search','item_search_3']
  const results: any = {}
  for (const ep of eps) {
    try {
      const res = await fetch(`https://aliexpress-datahub.p.rapidapi.com/${ep}?keywords=${encodeURIComponent(q)}&page=1`, {
        headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com' }, cache: 'no-store'
      })
      const data = await res.json()
      results[ep] = { status: res.status, sample: JSON.stringify(data).slice(0, 2000) }
    } catch(e: any) { results[ep] = { error: e.message } }
  }
  return NextResponse.json(results)
}
