import { NextRequest, NextResponse } from 'next/server'
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

const ProductSchema = z.object({
  title: z.string().describe('Product title/name'),
  price: z.number().describe('Price in MXN as a number, no symbols'),
  images: z.array(z.string()).describe('Array of product image URLs, high resolution'),
  description: z.string().optional().describe('Short product description'),
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
  const { url } = await req.json()
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

    // Wait a bit for dynamic content
    await stagehand.page.waitForTimeout(2000)

    // Use Stagehand AI extraction
    const product = await stagehand.extract({
      instruction: `Extract the main product information from this e-commerce page:
        - title: the full product name/title
        - price: the current selling price in MXN as a number only (no $ symbol). If USD, multiply by 17.5
        - images: array of product image URLs (high resolution, at least 5 images if available)
        - description: a brief product description if available`,
      schema: ProductSchema,
    })

    await stagehand.close()

    // Clean up images
    const images = (product.images || [])
      .filter((img: string) => img && img.length > 10)
      .slice(0, 6)
      .map((img: string) => img.startsWith('//') ? 'https:' + img : img)

    const response = NextResponse.json({
      success: true,
      raw: {
        title: product.title || '',
        price: product.price || 0,
        images,
        description: product.description || '',
      }
    })
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response

  } catch (e: any) {
    try { await stagehand.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
