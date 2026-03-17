// app/api/votacion/[asambleaId]/route.ts
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

    // Queries 1 y 2 en paralelo — no dependen una de la otra
    const [votante, asamblea, propietario] = await Promise.all([
      prisma.votante.findUnique({
        where: {
          asambleaId_cedula: { asambleaId, cedula },
        },
        select: {
          id: true,
          cedula: true,
          nombreCompleto: true,
          coeficienteTotal: true,
          confirmoAsistencia: true,
          propietariosRepresenta: true,
          votos: {
            select: { proposicionId: true },
          },
        },
      }),
      prisma.asamblea.findUnique({
        where: { id: asambleaId },
        select: {
          modalidad: true,
          linkZoom: true,
          estado: true,
          confirmacionActivada: true,
          confirmacionCerrada: true,
          conjuntoId: true
        },
      }),
      prisma.propietario.findFirst({
        where: { cedula, activo: true },
        select: { bloqueadoParaVotar: true, motivoBloqueo: true },
      }),
    ])

    if (!votante) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No estás registrado en esta asamblea',
      }, { status: 403 })
    }

    if (propietario?.bloqueadoParaVotar) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'SIN_DERECHO_AL_VOTO',
        data: {
          nombreCompleto: votante.nombreCompleto,
          motivo: propietario.motivoBloqueo ?? 'Mora en cuotas de administración',
        },
      }, { status: 403 })
    }

    // Query 3: proposiciones activas — va después porque es lógicamente independiente
    // pero necesitamos que votante exista para no desperdiciar la query
    const proposicionesVotadas = new Set(votante.votos.map(v => v.proposicionId))
    const { votos: _, ...votanteLimpio } = votante

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
          select: { id: true, texto: true, codigo: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { numeroOrden: 'asc' },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        votante: {
          ...votanteLimpio,
          coeficienteTotal: Number(votanteLimpio.coeficienteTotal),
        },
        proposiciones: proposiciones.map(prop => ({
          ...prop,
          yaVoto: proposicionesVotadas.has(prop.id),
        })),
        confirmacionActivada: asamblea?.confirmacionActivada ?? false,
        confirmacionCerrada: asamblea?.confirmacionCerrada ?? false,
        asambleaEstado: asamblea?.estado ?? 'activa',
        modalidad: asamblea?.modalidad ?? null,
        linkZoom: asamblea?.linkZoom ?? null,
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