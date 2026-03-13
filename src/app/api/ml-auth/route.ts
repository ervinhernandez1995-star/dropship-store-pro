import { NextRequest, NextResponse } from 'next/server'

// Step 1: Redirect user to ML login to authorize our app
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  // Step 2: ML redirected back with code — exchange for token
  if (code) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dropship-store-8wybmgy1b-erins-projects-50c165ad.vercel.app'
    
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID!,
        client_secret: process.env.ML_CLIENT_SECRET!,
        code,
        redirect_uri: `${appUrl}/api/ml-auth`,
      }),
    })

    const tokenData = await tokenRes.json()
    
    if (tokenData.access_token) {
      // Save token to env (in production use a DB or KV store)
      // For now, show it to the user so they can add it to Vercel env vars
      return new NextResponse(`
        <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
          <h2 style="color:#0ea5e9">✅ ¡Autorización exitosa!</h2>
          <p>Copia este token y agrégalo en Vercel como variable de entorno <strong>ML_ACCESS_TOKEN</strong>:</p>
          <textarea style="width:100%;height:100px;background:#222;color:#0ea5e9;padding:12px;border-radius:8px;font-size:12px">${tokenData.access_token}</textarea>
          <p style="color:#aaa;font-size:12px">Token expira en: ${Math.round(tokenData.expires_in/3600)} horas. Refresh token: ${tokenData.refresh_token}</p>
          <p>También copia el <strong>ML_REFRESH_TOKEN</strong>:</p>
          <textarea style="width:100%;height:60px;background:#222;color:#f59e0b;padding:12px;border-radius:8px;font-size:12px">${tokenData.refresh_token}</textarea>
          <br><br>
          <a href="/admin" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">← Volver al Admin</a>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
        <h2 style="color:#ef4444">❌ Error al obtener token</h2>
        <pre>${JSON.stringify(tokenData, null, 2)}</pre>
        <a href="/admin" style="color:#0ea5e9">← Volver</a>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }

  // Step 1: Redirect to ML OAuth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dropship-store-8wybmgy1b-erins-projects-50c165ad.vercel.app'
  const mlAuthUrl = `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${process.env.ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${appUrl}/api/ml-auth`)}`
  
  return NextResponse.redirect(mlAuthUrl)
}
