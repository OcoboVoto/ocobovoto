import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { accion } = body // 'abrir' o 'cerrar'

    const data: any = {}

    if (accion === 'abrir') {
      data.estado = 'activa'
      data.inicioVotacion = new Date()
    } else if (accion === 'cerrar') {
      data.estado = 'cerrada'
      data.finVotacion = new Date()
    }

    const proposicion = await prisma.proposicion.update({
        where: { id },
        data,
        include: { opciones: true },
      })


    return NextResponse.json<ApiResponse>({
      success: true,
      data: proposicion,
      message: `Votación ${accion === 'abrir' ? 'abierta' : 'cerrada'}`,
    })

  } catch (error) {
    console.error('Error en PATCH /api/proposiciones/[id]/estado:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al actualizar estado',
    }, { status: 500 })
  }
}