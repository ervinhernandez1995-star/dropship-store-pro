import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright-core'

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

  if (!bbApiKey || !bbProjectId) {
    return NextResponse.json({ error: 'Browserbase no configurado' }, { status: 500 })
  }

  let browser
  try {
    // Create Browserbase session via API
    const sessionRes = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': bbApiKey,
      },
      body: JSON.stringify({ projectId: bbProjectId }),
    })
    const session = await sessionRes.json()
    if (!session.id) throw new Error('No se pudo crear sesión de Browserbase')

    // Connect Playwright to Browserbase
    browser = await chromium.connectOverCDP(
      `wss://connect.browserbase.com?apiKey=${bbApiKey}&sessionId=${session.id}`
    )

    const context = browser.contexts()[0]
    const page = context.pages()[0]

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Extract all product links and data from the page
    const rawData = await page.evaluate(() => {
      const products: any[] = []
      const seen = new Set<string>()

      // Find all product links
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/item/"]')
      links.forEach(a => {
        const idMatch = a.href.match(/\/item\/(\d{10,})/)
        if (!idMatch || seen.has(idMatch[1])) return
        const id = idMatch[1]
        seen.add(id)

        // Find the card container
        const card = a.closest('[class*="product"]') || a.closest('li') || a.parentElement
        const titleEl = card?.querySelector('[class*="title"], h3, h2, span') 
        const priceEl = card?.querySelector('[class*="price"]')
        const imgEl = card?.querySelector('img')

        const title = titleEl?.textContent?.trim() || ''
        const priceText = priceEl?.textContent || ''
        const priceMatch = priceText.match(/[\d,]+\.?\d*/)
        const price = priceMatch ? parseFloat(priceMatch[0].replace(',','')) : 0
        const image = imgEl?.src || imgEl?.getAttribute('data-src') || ''

        if (title.length > 3) {
          products.push({ id, title: title.slice(0,200), price, image })
        }
      })

      return products
    })

    await browser.close()

    // Use Groq to clean up and validate the extracted data
    let products = rawData.slice(0, limit)

    if (groqKey && products.length > 0) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `Clean this product list. Fix titles (translate to Spanish if needed, remove duplicated words). Return ONLY valid JSON array with same structure: ${JSON.stringify(products.slice(0, 10))}`
            }],
            response_format: { type: 'json_object' }
          })
        })
        const groqData = await groqRes.json()
        const text = groqData.choices?.[0]?.message?.content || ''
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) products = parsed
        else if (parsed.products) products = parsed.products
      } catch { /* keep original if Groq fails */ }
    }

    return NextResponse.json(
      { success: true, products, total: products.length },
      { headers: cors }
    )

  } catch (e: any) {
    if (browser) try { await browser.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
