import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { publishToChannel } from '@/lib/ably/server'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'

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

    // Publicar en Ably: notificar a los votantes que hay una nueva votación abierta
    // o que una votación fue cerrada. La página de votación escucha este evento
    // y refresca la lista de proposiciones activas.
    await publishToChannel(
      ABLY_CHANNELS.asamblea(proposicion.asambleaId),
      ABLY_EVENTS.PROPOSICION_UPDATE,
      {
        proposicionId: id,
        estado: proposicion.estado,
        accion,
        timestamp: new Date().toISOString(),
      }
    )

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