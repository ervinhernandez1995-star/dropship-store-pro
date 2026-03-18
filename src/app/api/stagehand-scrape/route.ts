import { NextRequest, NextResponse } from 'next/server'

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

  try {
    // Create Browserbase session
    const sessionRes = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
      body: JSON.stringify({ projectId: bbProjectId }),
    })
    const session = await sessionRes.json()
    if (!session.id) throw new Error('Session failed')

    // Navigate
    await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
      body: JSON.stringify({ url }),
    })

    await new Promise(r => setTimeout(r, 3000))

    // Extract product data
    const execRes = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': bbApiKey },
      body: JSON.stringify({
        script: `
          (function() {
            // Title
            const tSels = ['h1','[class*="product-title"]','[class*="pdp-title"]','[class*="title--wrap"]','.ui-pdp-title'];
            let title = '';
            for (const s of tSels) {
              const el = document.querySelector(s);
              if (el && el.textContent.trim().length > 5) { title = el.textContent.trim().replace(/\\s+/g,' ').slice(0,200); break; }
            }
            // Price
            let price = 0;
            const m = document.body.innerText.match(/MX\\$\\s*([\\d,]+\\.?\\d*)/);
            if (m) price = parseFloat(m[1].replace(',',''));
            // Images
            const images = [];
            const seen = new Set();
            const sels = ['[class*="image-view"] img','[class*="slider"] img','[class*="gallery"] img','img[src*="alicdn"]','img[src*="mlstatic"]'];
            for (const sel of sels) {
              document.querySelectorAll(sel).forEach(img => {
                const s = (img.src||'').split('?')[0];
                if (!s||seen.has(s)||/banner|promo|icon|logo/.test(s)) return;
                if (img.width > 0 && img.width < 80) return;
                seen.add(s);
                images.push(s.replace(/_\\d+x\\d+(\\.\\w+)$/, '$1').replace(/^\\/\\//, 'https://'));
              });
              if (images.length >= 3) break;
            }
            return JSON.stringify({ title, price, images: images.slice(0,6) });
          })()
        `
      }),
    })

    // Stop session
    await fetch(`https://www.browserbase.com/v1/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { 'X-BB-API-Key': bbApiKey },
    })

    const execData = await execRes.json()
    const raw = JSON.parse(execData.result || '{}')

    // Translate title with Groq if needed
    let title = raw.title || ''
    if (groqKey && title && title.length > 5) {
      try {
        const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 150,
            messages: [{ role: 'user', content: `Translate to natural Spanish (Mexico) for an online store. Return ONLY the translated title: "${title}"` }]
          })
        })
        const gd = await gr.json()
        const t = gd.choices?.[0]?.message?.content?.trim()
        if (t && t.length > 5 && !t.includes('{')) title = t
      } catch {}
    }

    return NextResponse.json({
      success: true,
      raw: { title, price: raw.price || 0, images: raw.images || [] }
    }, { headers: cors })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors })
  }
}
