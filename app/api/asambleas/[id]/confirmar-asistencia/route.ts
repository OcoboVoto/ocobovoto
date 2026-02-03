import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Activar confirmación en la asamblea
    const asamblea = await prisma.asamblea.update({
      where: { id },
      data: {
        confirmacionActivada: true,
        confirmacionCerrada: false
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: asamblea,
      message: 'Confirmación de asistencia activada',
    })

  } catch (error) {
    console.error('Error en POST /api/asambleas/[id]/confirmar-asistencia:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al activar confirmación',
    }, { status: 500 })
  }
}