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
    const { nombre, nit, coeficienteTotal } = body

    const conjunto = await prisma.conjunto.update({
      where: { id },
      data: {
        nombre,
        nit,
        coeficienteTotal,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: conjunto,
      message: 'Conjunto actualizado',
    })

  } catch (error) {
    console.error('Error en PATCH /api/super/conjuntos/[id]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al actualizar conjunto',
    }, { status: 500 })
  }
}