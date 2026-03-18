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
  const { url, limit = 20 } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const bbApiKey = process.env.BROWSERBASE_API_KEY
  const bbProjectId = process.env.BROWSERBASE_PROJECT_ID
  const groqKey = process.env.GROQ_API_KEY

  if (!bbApiKey || !bbProjectId || !groqKey) {
    return NextResponse.json({ error: 'Credenciales no configuradas' }, { status: 500 })
  }

  const stagehand = new Stagehand({
    env: 'BROWSERBASE' as const,
    apiKey: bbApiKey,
    projectId: bbProjectId,
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
    await page.waitForTimeout(3000)

    const result = await stagehand.extract({
      instruction: `Extract up to ${limit} products from this page. Each product needs: id (the number ID from product URL), title, price in MXN as number, image (main photo URL)`,
      schema: z.object({
        products: z.array(z.object({
          id: z.string(),
          title: z.string(),
          price: z.number(),
          image: z.string(),
        }))
      }),
    })

    await stagehand.close()

    return NextResponse.json(
      { success: true, products: result.products || [], total: (result.products || []).length },
      { headers: cors }
    )
  } catch (e: any) {
    try { await stagehand.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
