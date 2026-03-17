import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /admin route
  if (pathname.startsWith('/admin')) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
    const cookie = req.cookies.get('admin_auth')?.value
    const valid = cookie === Buffer.from(adminPassword).toString('base64')
    if (!valid) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
