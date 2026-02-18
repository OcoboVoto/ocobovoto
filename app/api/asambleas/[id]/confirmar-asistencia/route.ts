import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase/createBrowserClient'
import { ApiResponse } from '@/types'

const MAX_CONFIRMACIONES = 2

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: { votantes: true },
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
        error: 'Solo se puede activar confirmación en asambleas activas',
      }, { status: 400 })
    }

    // Verificar que no se han usado las 2 confirmaciones
    if (asamblea.confirmacionUsada >= MAX_CONFIRMACIONES) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Ya se usaron las ${MAX_CONFIRMACIONES} confirmaciones permitidas para esta asamblea`,
      }, { status: 400 })
    }

    if (asamblea.confirmacionActivada && !asamblea.confirmacionCerrada) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Ya hay una confirmación activa. Ciérrala antes de activar otra.',
      }, { status: 400 })
    }

    //eliminar registro anterior para poder confirmar de nuevo
    await prisma.confirmacionAsistencia.deleteMany({
      where: { asambleaId: id },
    })


    // Resetear confirmoAsistencia de todos los votantes para esta nueva ronda
    await prisma.votante.updateMany({
      where: { asambleaId: id },
      data: {
        confirmoAsistencia: false,
        horaConfirmacion: null,
      },
    })

    // Activar confirmación e incrementar contador
    const asambleaActualizada = await prisma.asamblea.update({
      where: { id },
      data: {
        confirmacionActivada: true,
        confirmacionCerrada: false,
        confirmacionUsada: asamblea.confirmacionUsada + 1,
      },
    })

    const usosRestantes = MAX_CONFIRMACIONES - asambleaActualizada.confirmacionUsada

    //BROADCAST: Notificar a todos los votantes conectados
    await supabase.channel(`asamblea-${id}`).send({
      type: 'broadcast',
      event: 'confirmacion',
      payload: {
        confirmacionActivada: true,
        confirmacionCerrada: false,
        confirmacionUsada: asambleaActualizada.confirmacionUsada,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        confirmacionUsada: asambleaActualizada.confirmacionUsada,
        usosRestantes,
        totalVotantes: asamblea.votantes.length,
      },
      message: `Confirmación #${asambleaActualizada.confirmacionUsada} activada.`,
    })
  } catch (error) {
    console.error('Error en POST confirmar-asistencia:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al activar confirmación',
    }, { status: 500 })
  }
}