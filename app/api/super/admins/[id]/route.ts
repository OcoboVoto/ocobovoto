import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionCookie = request.cookies.get('super-admin-session')
    
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No autenticado',
      }, { status: 401 })
    }

    const body = await request.json()
    const { activo } = body

    const admin = await prisma.usuarioAdmin.update({
      where: { id },
      data: { activo },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: admin,
      message: `Admin ${activo ? 'activado' : 'desactivado'}`,
    })

  } catch (error) {
    console.error('Error en PATCH /api/super/admins/[id]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al actualizar admin',
    }, { status: 500 })
  }
}