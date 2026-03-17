import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', Buffer.from(adminPassword).toString('base64'), {
    httpOnly: true, secure: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 7
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_auth')
  return res
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('admin_auth')?.value
  const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
  const valid = cookie === Buffer.from(adminPassword).toString('base64')
  return NextResponse.json({ authenticated: valid })
}
