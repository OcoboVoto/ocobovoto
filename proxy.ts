import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {

  const superAdminSession = request.cookies.get('super-admin-session')
  const adminSession = request.cookies.get('admin-session')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isSuperAdminRoute = request.nextUrl.pathname.startsWith('/super-admin')
  const isLoginRoute = request.nextUrl.pathname === '/login'
  const isSuperLoginRoute = request.nextUrl.pathname === '/super-login'

  // Si intenta acceder a rutas de admin sin sesión, redirigir a login
  if (isAdminRoute && !adminSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Proteger rutas de super admin
  if (isSuperAdminRoute && !superAdminSession) {
    return NextResponse.redirect(new URL('/super-login', request.url))
  }

  // Si admin normal intenta acceder a super admin
  if (isSuperAdminRoute && adminSession && !superAdminSession) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Si ya está logueado e intenta acceder a login, redirigir al dashboard
  if (isLoginRoute && adminSession) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (isSuperLoginRoute && superAdminSession) {
    return NextResponse.redirect(new URL('/super-admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*', '/login', '/super-login']
}