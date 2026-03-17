import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
  
  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }
  
  const cookieValue = Buffer.from(adminPassword).toString('base64')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', '', { maxAge: 0, path: '/' })
  return res
}

export async function GET(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
  const cookie = req.cookies.get('admin_auth')?.value
  const valid = cookie === Buffer.from(adminPassword).toString('base64')
  return NextResponse.json({ authenticated: valid })
}
