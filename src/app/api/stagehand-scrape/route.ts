import { NextRequest, NextResponse } from 'next/server'
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const bbApiKey = process.env.BROWSERBASE_API_KEY
  const bbProjectId = process.env.BROWSERBASE_PROJECT_ID
  const groqKey = process.env.GROQ_API_KEY

  if (!bbApiKey || !bbProjectId) {
    return NextResponse.json({ error: 'Browserbase no configurado' }, { status: 500 })
  }

  if (!groqKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
  }

  const stagehand = new Stagehand({
    env: 'BROWSERBASE' as const,
    apiKey: bbApiKey,
    projectId: bbProjectId,
    // Groq is OpenAI-compatible and FREE
    modelName: 'llama-3.3-70b-versatile' as any,
    modelClientOptions: {
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
    },
    verbose: 0 as const,
  })

  try {
    await stagehand.init()
    const page = stagehand.page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)

    const product = await stagehand.extract({
      instruction: 'Extract: title (full product name), price in MXN as number only (if USD convert x17.5), images array (product photos only, not banners)',
      schema: z.object({
        title: z.string(),
        price: z.number(),
        images: z.array(z.string()),
      }),
    })

    await stagehand.close()

    const images = (product.images || [])
      .filter((img: string) => img && img.length > 10)
      .slice(0, 6)
      .map((img: string) => img.startsWith('//') ? 'https:' + img : img)

    return NextResponse.json(
      { success: true, raw: { title: product.title, price: product.price, images } },
      { headers: cors }
    )
  } catch (e: any) {
    try { await stagehand.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
