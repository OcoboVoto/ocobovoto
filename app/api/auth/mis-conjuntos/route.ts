import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('admin-session')
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)

    const admin = await prisma.usuarioAdmin.findUnique({
      where: { id: session.id },
      select: {
        conjunto: {
          select: { id: true, nombre: true, nit: true },
        },
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: admin?.conjunto ?? [],
    })
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno' }, { status: 500 })
  }
}