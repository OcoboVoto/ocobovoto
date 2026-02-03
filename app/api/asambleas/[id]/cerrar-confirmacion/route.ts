import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener asamblea con votantes
    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        conjunto: true,
        votantes: true,
      },
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    // Calcular quórum final con los que confirmaron
    const votantesConfirmados = asamblea.votantes.filter(v => v.confirmoAsistencia)
    
    const coeficienteFinal = votantesConfirmados.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    const coeficienteTotal = Number(asamblea.conjunto.coeficienteTotal)
    const quorumFinal = (coeficienteFinal / coeficienteTotal) * 100

    // Ya no se puede confirmar más
    await prisma.asamblea.update({
      where: { id },
      data: {
        quorumFinal,
        confirmacionActivada: false,
        confirmacionCerrada: true
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        quorumFinal,
        totalConfirmados: votantesConfirmados.length,
        totalVotantes: asamblea.votantes.length,
      },
      message: 'Confirmación cerrada y quórum final calculado',
    })

  } catch (error) {
    console.error('Error en POST /api/asambleas/[id]/cerrar-confirmacion:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al cerrar confirmación',
    }, { status: 500 })
  }
}