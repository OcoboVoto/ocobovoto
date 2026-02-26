import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // En este flujo, el navegador ya borró admin-selector desde el cliente,
    // pero los datos los recibimos en el body desde el state del componente.
    // Necesitamos confiar en el conjuntoId + verificar que el admin existe.
    const body = await request.json()
    const { conjuntoId } = body

    if (!conjuntoId) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Conjunto requerido' }, { status: 400 })
    }

    // Buscar el conjunto y su admin asignado
    const conjunto = await prisma.conjunto.findUnique({
      where: { id: conjuntoId },
      select: {
        id: true,
        nombre: true,
        admin: {
          select: {
            id: true,
            nombre: true,
            email: true,
            activo: true,
          },
        },
      },
    })

    if (!conjunto || !conjunto.admin || !conjunto.admin.activo) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Conjunto o admin no válido' }, { status: 400 })
    }

    const sessionData = {
      id: conjunto.admin.id,
      email: conjunto.admin.email,
      nombre: conjunto.admin.nombre,
      conjuntoId: conjunto.id,
      conjuntoNombre: conjunto.nombre,
    }

    const response = NextResponse.json<ApiResponse>({ success: true, data: sessionData })

    response.cookies.set('admin-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
