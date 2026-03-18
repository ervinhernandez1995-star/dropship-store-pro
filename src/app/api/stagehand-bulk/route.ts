import { NextRequest, NextResponse } from 'next/server'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

// Use Browserbase REST API to run scraping without installing Playwright
async function scrapeWithBrowserbase(url: string, bbApiKey: string, bbProjectId: string): Promise<string> {
  // Create session
  const sessionRes = await fetch('https://www.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
    body: JSON.stringify({ projectId: bbProjectId, browserSettings: { viewport: { width: 1280, height: 800 } } }),
  })
  const session = await sessionRes.json()
  if (!session.id) throw new Error('Browserbase session failed: ' + JSON.stringify(session))

  // Execute via Browserbase REST debug/execute endpoint  
  // We need to use the CDP HTTP endpoint to run JS
  await new Promise(r => setTimeout(r, 2000))

  // Navigate to URL
  const navRes = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
    body: JSON.stringify({ url }),
  })

  await new Promise(r => setTimeout(r, 3000)) // wait for page load

  // Get page content
  const contentRes = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
    body: JSON.stringify({
      script: `
        (function() {
          const products = [];
          const seen = new Set();
          document.querySelectorAll('a[href*="/item/"]').forEach(a => {
            const idMatch = a.href.match(/\\/item\\/(\\d{10,})/);
            if (!idMatch || seen.has(idMatch[1])) return;
            const id = idMatch[1];
            seen.add(id);
            const card = a.closest('[class*="product"]') || a.closest('li') || a.parentElement;
            const titleEl = card && (card.querySelector('[class*="title"]') || card.querySelector('h3') || card.querySelector('span'));
            const priceEl = card && card.querySelector('[class*="price"]');
            const imgEl = card && card.querySelector('img');
            const title = titleEl ? titleEl.textContent.trim().slice(0, 200) : '';
            const priceText = priceEl ? priceEl.textContent : '';
            const priceMatch = priceText.match(/[\\d,]+\\.?\\d*/);
            const price = priceMatch ? parseFloat(priceMatch[0].replace(',','')) : 0;
            const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';
            if (title.length > 3) products.push({ id, title, price, image });
          });
          return JSON.stringify(products.slice(0, 20));
        })()
      `
    }),
  })

  // Stop session
  await fetch(`https://www.browserbase.com/v1/sessions/${session.id}`, {
    method: 'DELETE',
    headers: { 'X-BB-API-Key': bbApiKey },
  })

  if (!contentRes.ok) throw new Error('Execute failed: ' + contentRes.status)
  const result = await contentRes.json()
  return result.result || '[]'
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

  try {
    const rawJson = await scrapeWithBrowserbase(url, bbApiKey, bbProjectId)
    let products = JSON.parse(rawJson).slice(0, limit)

    // Use Groq to clean titles
    if (groqKey && products.length > 0) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: `Translate product titles to Spanish. Return ONLY a JSON object like {"products": [...same array with titles translated...]}. Array: ${JSON.stringify(products.slice(0, 10))}`
            }],
            response_format: { type: 'json_object' }
          })
        })
        const gd = await groqRes.json()
        const parsed = JSON.parse(gd.choices?.[0]?.message?.content || '{}')
        if (parsed.products?.length > 0) products = parsed.products
      } catch { /* keep original */ }
    }

    return NextResponse.json({ success: true, products, total: products.length }, { headers: cors })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
