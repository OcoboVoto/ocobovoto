import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { publishToChannel } from '@/lib/ably/server'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const votantesConfirmados = asamblea.votantes.filter(v => v.confirmoAsistencia)

    const coeficienteFinal = votantesConfirmados.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    const coeficienteTotal = Number(asamblea.conjunto.coeficienteTotal)
    const quorumFinal = (coeficienteFinal / coeficienteTotal) * 100

    await prisma.asamblea.update({
      where: { id },
      data: {
        quorumFinal,
        confirmacionActivada: false,
        confirmacionCerrada: true,
      },
    })

    const channelName = ABLY_CHANNELS.asamblea(id)

    // Notificar a votantes: la confirmación fue cerrada
    await publishToChannel(channelName, ABLY_EVENTS.CONFIRMACION, {
      confirmacionActivada: false,
      confirmacionCerrada: true,
      timestamp: new Date().toISOString(),
    })

    // Notificar al admin: actualizar estado general de la asamblea
    await publishToChannel(channelName, ABLY_EVENTS.ASAMBLEA_UPDATE, {
      tipo: 'confirmacion-cerrada',
      quorumFinal,
      totalConfirmados: votantesConfirmados.length,
      totalVotantes: asamblea.votantes.length,
      timestamp: new Date().toISOString(),
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