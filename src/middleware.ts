import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'TodoClick2024@'
    const cookie = req.cookies.get('admin_auth')?.value
    
    // Compare: cookie stores base64 of password
    let valid = false
    try {
      valid = cookie === Buffer.from(adminPassword).toString('base64')
    } catch {
      valid = false
    }
    
    if (!valid) {
      const loginUrl = new URL('/admin-login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
