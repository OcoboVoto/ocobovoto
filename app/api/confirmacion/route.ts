import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, votanteId } = body

    console.log('🔵 Recibiendo confirmación:', { asambleaId, votanteId })

    // Verificar que la confirmación está activada
    const asamblea = await prisma.asamblea.findUnique({
      where: { id: asambleaId },
      include: {
        conjunto: true,
        votantes: {
          include: {
            confirmaciones: true,
          },
        },
      },
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    if (!asamblea.confirmacionActivada) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'La confirmación no está activada',
      }, { status: 400 })
    }
    
    //Verificar que no esté cerrada
    if (asamblea.confirmacionCerrada) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'El período de confirmación ha finalizado',
        }, { status: 400 })
      }

    // Verificar si ya confirmó
    const yaConfirmo = await prisma.confirmacionAsistencia.findUnique({
      where: {
        asambleaId_votanteId: {
          asambleaId,
          votanteId,
        },
      },
    })

    if (yaConfirmo) {
      console.log('⚠️ Ya había confirmado')
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Ya confirmaste tu asistencia',
      }, { status: 400 })
    }
    console.log('✅ Registrando confirmación...')
    // Registrar confirmación
    await prisma.confirmacionAsistencia.create({
      data: {
        asambleaId,
        votanteId,
      },
    })

    // Actualizar votante
    await prisma.votante.update({
      where: { id: votanteId },
      data: {
        confirmoAsistencia: true,
        horaConfirmacion: new Date(),
      },
    })
    console.log('✅ Votante actualizado')

    // Recalcular quórum final
    const votantesConfirmados = await prisma.votante.findMany({
      where: {
        asambleaId,
        confirmoAsistencia: true,
      },
    })

    const coeficienteFinal = votantesConfirmados.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    const coeficienteTotal = Number(asamblea.conjunto.coeficienteTotal)
    const quorumFinal = (coeficienteFinal / coeficienteTotal) * 100

    await prisma.asamblea.update({
      where: { id: asambleaId },
      data: { quorumFinal },
    })
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        quorumFinal,
        totalConfirmados: votantesConfirmados.length,
      },
      message: 'Asistencia confirmada',
    })

  } catch (error) {
    console.error('Error en POST /api/confirmacion:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al confirmar asistencia',
    }, { status: 500 })
  }
}