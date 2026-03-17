import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/customer-auth  { action: 'signup'|'login'|'logout', email, password, name?, phone? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, email, password, name, phone } = body

  if (action === 'signup') {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    // Save extra profile info
    if (data.user) {
      await supabaseAdmin.from('customers').upsert({
        id: data.user.id, email, name: name || '', phone: phone || '', created_at: new Date().toISOString()
      })
    }
    return NextResponse.json({ user: data.user, session: data.session })
  }

  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    // Get profile
    const { data: profile } = await supabaseAdmin.from('customers').select('*').eq('id', data.user.id).single()
    const res = NextResponse.json({ user: data.user, session: data.session, profile })
    res.cookies.set('customer_token', data.session.access_token, { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })
    return res
  }

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete('customer_token')
    return res
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET /api/customer-auth — get profile by token
export async function GET(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value
  if (!token) return NextResponse.json({ user: null })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ user: null })
  const { data: profile } = await supabaseAdmin.from('customers').select('*').eq('id', user.id).single()
  return NextResponse.json({ user, profile })
}
