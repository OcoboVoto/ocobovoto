//app/api/votacion
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asambleaId: string }> }
) {
  try {
    const { asambleaId } = await params
    const cedula = request.nextUrl.searchParams.get('cedula')

    if (!cedula) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cédula requerida',
      }, { status: 400 })
    }

    // Verificar que el votante está registrado
    const votante = await prisma.votante.findUnique({
      where: {
        asambleaId_cedula: {
          asambleaId,
          cedula,
        },
      },
      select: {
        id: true,
        cedula: true,
        nombreCompleto: true,
        coeficienteTotal: true,
        confirmoAsistencia: true,  
      },
    })

    if (!votante) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No estás registrado en esta asamblea',
      }, { status: 403 })
    }

    // Obtener proposiciones activas y sus opciones
    const proposiciones = await prisma.proposicion.findMany({
      where: {
        asambleaId,
        estado: 'activa',
      },
      include: {
        opciones: {
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { numeroOrden: 'asc' },
    })

    // Verificar cuáles ya votó
    const votos = await prisma.voto.findMany({
      where: {
        votanteId: votante.id,
      },
      select: { proposicionId: true },
    })

    const proposicionesVotadas = new Set(votos.map(v => v.proposicionId))

    const proposicionesConEstado = proposiciones.map(prop => ({
      ...prop,
      yaVoto: proposicionesVotadas.has(prop.id),
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        votante,
        proposiciones: proposicionesConEstado,
      },
    })

  } catch (error) {
    console.error('Error en GET /api/votacion/[asambleaId]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno',
    }, { status: 500 })
  }
}