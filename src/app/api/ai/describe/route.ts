import { NextRequest, NextResponse } from 'next/server'
import { generateProductDescription } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { name, category, price } = await req.json()
    const description = await generateProductDescription(name, category, price)
    return NextResponse.json({ description })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
