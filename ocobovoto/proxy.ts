import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('admin-session')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginRoute = request.nextUrl.pathname === '/login'

  // Si intenta acceder a rutas de admin sin sesión, redirigir a login
  if (isAdminRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya está logueado e intenta acceder a login, redirigir al dashboard
  if (isLoginRoute && sessionCookie) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}