import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST — signup | login | logout
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, email, password, name, phone } = body

  if (action === 'signup') {
    // Create user with admin client (bypasses email confirmation)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name: name || '', phone: phone || '' }
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Save profile
    if (data.user) {
      await supabaseAdmin.from('customers').upsert({
        id: data.user.id, email, name: name || '', phone: phone || '',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      })
    }

    // Auto-login after signup
    const { data: signIn, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', email
    })

    // Use signInWithPassword via admin approach — generate a session
    // We'll do a direct sign in now that user is confirmed
    const signInRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ email, password })
    })
    const session = await signInRes.json()
    if (session.error) return NextResponse.json({ error: session.error.message || 'Error al iniciar sesión' }, { status: 400 })

    const profile = { name: name || '', phone: phone || '', email }
    const res = NextResponse.json({ user: session.user, session, profile })
    res.cookies.set('customer_token', session.access_token, {
      httpOnly: false, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    })
    return res
  }

  if (action === 'login') {
    // Direct REST call to Supabase Auth — most reliable
    const signInRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ email, password })
    })
    const session = await signInRes.json()
    if (session.error || !session.access_token) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabaseAdmin.from('customers').select('*').eq('email', email).single()

    const res = NextResponse.json({ user: session.user, session, profile })
    res.cookies.set('customer_token', session.access_token, {
      httpOnly: false, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/'
    })
    return res
  }

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('customer_token', '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET — verify token and return user
export async function GET(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value
  if (!token) return NextResponse.json({ user: null })

  // Verify token via Supabase REST
  const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${token}`,
    }
  })
  if (!userRes.ok) return NextResponse.json({ user: null })
  const user = await userRes.json()
  if (!user?.id) return NextResponse.json({ user: null })

  const { data: profile } = await supabaseAdmin.from('customers').select('*').eq('id', user.id).single()
  return NextResponse.json({ user, profile })
}
