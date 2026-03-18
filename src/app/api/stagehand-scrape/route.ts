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
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const bbApiKey = process.env.BROWSERBASE_API_KEY
  const bbProjectId = process.env.BROWSERBASE_PROJECT_ID
  const groqKey = process.env.GROQ_API_KEY

  if (!bbApiKey || !bbProjectId) {
    return NextResponse.json({ error: 'Browserbase no configurado' }, { status: 500 })
  }

  let browser
  try {
    const sessionRes = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
      body: JSON.stringify({ projectId: bbProjectId }),
    })
    const session = await sessionRes.json()
    if (!session.id) throw new Error('No se pudo crear sesión de Browserbase')

    browser = await chromium.connectOverCDP(
      `wss://connect.browserbase.com?apiKey=${bbApiKey}&sessionId=${session.id}`
    )
    const context = browser.contexts()[0]
    const page = context.pages()[0]

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)

    // Extract product data directly from the page
    const raw = await page.evaluate(() => {
      // Title
      const titleSelectors = ['h1', '[class*="product-title"]', '[class*="pdp-title"]', '[class*="title--wrap"]', '.ui-pdp-title']
      let title = ''
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel)
        if (el && el.textContent && el.textContent.trim().length > 5) {
          title = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 200)
          break
        }
      }

      // Price
      let price = 0
      const bodyText = document.body.innerText || ''
      const mxMatch = bodyText.match(/MX\$\s*([\d,]+\.?\d*)/)
      if (mxMatch) price = parseFloat(mxMatch[1].replace(',', ''))

      // Images from product gallery
      const images: string[] = []
      const seen = new Set<string>()
      const gallerySels = ['[class*="image-view"] img', '[class*="slider"] img[src*="alicdn"]', '[class*="thumb"] img[src*="alicdn"]', '[class*="gallery"] img', 'img[src*="alicdn"]', 'img[src*="mlstatic"]']
      for (const sel of gallerySels) {
        document.querySelectorAll<HTMLImageElement>(sel).forEach(img => {
          const s = (img.src || '').split('?')[0]
          if (!s || seen.has(s) || s.includes('banner') || s.includes('promo')) return
          if (img.width > 0 && img.width < 100) return
          seen.add(s)
          const hq = s.replace(/_\d+x\d+(\.[^.]+)$/, '$1')
          images.push(hq.startsWith('//') ? 'https:' + hq : hq)
        })
        if (images.length >= 3) break
      }

      return { title, price, images: images.slice(0, 6) }
    })

    await browser.close()

    // Use Groq to improve title translation if needed
    let title = raw.title
    if (groqKey && title && !/[áéíóúñ]/.test(title) && title.length > 10) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 200,
            messages: [{ role: 'user', content: `Translate this product title to Spanish (Mexico), keep it natural and commercial. Return ONLY the translated title, nothing else: "${title}"` }]
          })
        })
        const gd = await groqRes.json()
        const translated = gd.choices?.[0]?.message?.content?.trim()
        if (translated && translated.length > 5) title = translated
      } catch {}
    }

    return NextResponse.json(
      { success: true, raw: { title, price: raw.price, images: raw.images } },
      { headers: cors }
    )

  } catch (e: any) {
    if (browser) try { await browser.close() } catch {}
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
