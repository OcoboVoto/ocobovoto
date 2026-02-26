import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('admin-session')
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)

    // Verificar que efectivamente tiene múltiples conjuntos
    const admin = await prisma.usuarioAdmin.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        conjunto: { select: { id: true, nombre: true, nit: true } },
      },
    })

    if (!admin || admin.conjunto.length <= 1) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No aplica' }, { status: 400 })
    }

    const response = NextResponse.json<ApiResponse>({ success: true, message: 'Sesión preparada para cambio' })

    // Borrar la sesión activa
    response.cookies.delete('admin-session')

    // Guardar cookie temporal con los datos del admin (sin conjuntoId)
    // El login la leerá y saltará directo al selector
    response.cookies.set('admin-selector', JSON.stringify({
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      conjuntos: admin.conjunto,
    }), {
      httpOnly: false, // necesita ser leída en el cliente por la página de login
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // expira en 5 minutos
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno' }, { status: 500 })
  }
}