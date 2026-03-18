import { NextRequest, NextResponse } from 'next/server'
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

const SearchSchema = z.object({
  products: z.array(z.object({
    id: z.string().describe('Product ID from URL, numbers only'),
    title: z.string().describe('Product title'),
    price: z.number().describe('Price in MXN as number'),
    image: z.string().describe('Main product image URL'),
  })).describe('List of products found on the page')
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  const { url, limit = 20 } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID
  if (!apiKey || !projectId) {
    return NextResponse.json({ error: 'Browserbase no configurado' }, { status: 500 })
  }

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    projectId,
    verbose: 0,
    headless: true,
  })

  try {
    await stagehand.init()
    await stagehand.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await stagehand.page.waitForTimeout(3000)

    // Extract product list with AI
    const result = await stagehand.extract({
      instruction: `Extract a list of products shown on this search/category page. 
        For each product get:
        - id: the product ID number from the URL (numbers only, e.g. "1005007476838122")
        - title: product name
        - price: price in MXN as a number
        - image: main product image URL
        Get up to ${limit} products.`,
      schema: SearchSchema,
    })

    await stagehand.close()

    const response = NextResponse.json({
      success: true,
      products: result.products || [],
      total: (result.products || []).length,
    })
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response

  } catch (e: any) {
    try { await stagehand.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
