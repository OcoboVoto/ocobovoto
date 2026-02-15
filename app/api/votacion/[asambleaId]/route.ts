// app/api/votacion/[asambleaId]/route.tsx
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

    // UNA SOLA QUERY: Votante + Proposiciones + Votos en un solo round-trip
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
        votos: {
          select: { proposicionId: true },
        },
      },
    })

    if (!votante) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No estás registrado en esta asamblea',
      }, { status: 403 })
    }

    // Extraer votos y limpiar el objeto votante
    const proposicionesVotadas = new Set(votante.votos.map(v => v.proposicionId))
    const { votos: _, ...votanteLimpio } = votante

    // Segunda query: proposiciones activas (inevitable, distinta tabla raíz)
    const proposiciones = await prisma.proposicion.findMany({
      where: {
        asambleaId,
        estado: 'activa',
      },
      select: {
        id: true,
        numeroOrden: true,
        titulo: true,
        descripcion: true,
        tipoPregunta: true,
        opciones: {
          select: {
            id: true,
            texto: true,
            codigo: true,
          },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { numeroOrden: 'asc' },
    })

    const proposicionesConEstado = proposiciones.map(prop => ({
      ...prop,
      yaVoto: proposicionesVotadas.has(prop.id),
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        votante: votanteLimpio,
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