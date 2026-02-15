// app/api/proposiciones/[id]/anular/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const proposicion = await prisma.proposicion.findUnique({
      where: { id },
      include: {
        asamblea: true,
        _count: { select: { votos: true } },
      },
    })

    if (!proposicion) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Proposición no encontrada',
      }, { status: 404 })
    }

    if (proposicion.estado === 'anulada') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'La proposición ya está anulada',
      }, { status: 400 })
    }

    if (proposicion.asamblea.estado === 'finalizada') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No se puede anular una proposición de una asamblea finalizada',
      }, { status: 400 })
    }

    const proposicionAnulada = await prisma.proposicion.update({
      where: { id },
      data: {
        estado: 'anulada',
        finVotacion: proposicion.estado === 'abierta' ? new Date() : proposicion.finVotacion,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: proposicionAnulada.id,
        estado: proposicionAnulada.estado,
        votosAntes: proposicion._count.votos,
      },
      message: `Proposición anulada. ${proposicion._count.votos > 0 ? `Tenía ${proposicion._count.votos} voto(s) que quedan registrados para auditoría.` : ''}`,
    })
  } catch (error) {
    console.error('Error en POST /api/proposiciones/[id]/anular:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al anular la proposición',
    }, { status: 500 })
  }
}