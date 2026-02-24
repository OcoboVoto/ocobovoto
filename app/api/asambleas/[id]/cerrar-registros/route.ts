//app/api/asambleas/[id]/cerrar-registros/route.ts
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

    if (asamblea.estado !== 'activa') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Solo se puede cerrar el registro en una asamblea activa',
      }, { status: 400 })
    }

    if (asamblea.registrosCerrados) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El registro ya fue cerrado anteriormente',
      }, { status: 400 })
    }

    const coeficienteTotalConjunto = Number(asamblea.conjunto.coeficienteTotal)

    const coeficienteAcumulado = asamblea.votantes.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    const totalVotantes = asamblea.votantes.length

    const porcentaje = coeficienteTotalConjunto > 0
      ? (coeficienteAcumulado / coeficienteTotalConjunto) * 100
      : 0

    // Redondeo profesional
    const porcentajeRedondeado = Number(porcentaje.toFixed(2))
    const coeficienteRedondeado = Number(coeficienteAcumulado.toFixed(4))

    // Guardar snapshot INMUTABLE
    const asambleaActualizada = await prisma.asamblea.update({
      where: { id },
      data: {
        registrosCerrados: true,
        fechaCierreRegistros: new Date(),

        quorumAlCierreRegistros: porcentajeRedondeado,

        votantesCierre: totalVotantes,
        coeficienteCierre: coeficienteRedondeado,
        porcentajeCierre: porcentajeRedondeado,
      },
    })

    // Publicar en Ably: notificar a TODOS los votantes conectados en tiempo real
    await publishToChannel(
      ABLY_CHANNELS.asamblea(id),
      ABLY_EVENTS.CONFIRMACION,
      {
        confirmacionActivada: true,
        confirmacionCerrada: false,
        confirmacionUsada: asambleaActualizada.confirmacionUsada,
        timestamp: new Date().toISOString(),
      }
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        porcentajeCierre: porcentajeRedondeado,
        coeficienteCierre: coeficienteRedondeado,
        votantesCierre: totalVotantes,
        fechaCierreRegistros: asambleaActualizada.fechaCierreRegistros,
        quorumAlCierreRegistros: porcentajeRedondeado
      },
      message: `Registro cerrado con ${porcentajeRedondeado}% de quórum`,
    })

  } catch (error) {
    console.error('Error en POST cerrar-registros:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al cerrar registros',
    }, { status: 500 })
  }
}
