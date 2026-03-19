// CJDropshipping API client
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

let cachedToken: { token: string; expires: number } | null = null

export async function getCJToken(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY
  if (!apiKey) throw new Error('CJ_API_KEY no configurada')

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expires - 300000) {
    return cachedToken.token
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.result || !data.data?.accessToken) {
    throw new Error('CJ auth failed: ' + (data.message || JSON.stringify(data)))
  }

  const expiresAt = new Date(data.data.accessTokenExpiryDate).getTime()
  cachedToken = { token: data.data.accessToken, expires: expiresAt }
  return cachedToken.token
}

export async function cjFetch(path: string, options: RequestInit = {}) {
  const token = await getCJToken()
  const res = await fetch(`${CJ_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'CJ-Access-Token': token,
      ...(options.headers || {}),
    },
  })
  return res.json()
}
