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

    // Query 1: Votante + sus votos ya emitidos
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
        propietariosRepresenta: true,
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

    // Query 2: Asamblea - estado + modalidad + confirmación
    // Se incluye confirmacionActivada para que el polling lo detecte
    const asamblea = await prisma.asamblea.findUnique({
      where: { id: asambleaId },
      select: {
        modalidad: true,
        linkZoom: true,
        estado: true,
        confirmacionActivada: true,
        confirmacionCerrada: true,
      },
    })

    // Query 3: Solo proposiciones activas (las que el votante puede ver ahora)
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
        votante: {
          ...votanteLimpio,
          coeficienteTotal: Number(votanteLimpio.coeficienteTotal),
        },
        proposiciones: proposicionesConEstado,
        // Campos nuevos para el polling — el hook los usa para detectar cambios
        confirmacionActivada: asamblea?.confirmacionActivada ?? false,
        confirmacionCerrada: asamblea?.confirmacionCerrada ?? false,
        asambleaEstado: asamblea?.estado ?? 'activa',
        modalidad: asamblea?.modalidad ?? null,
        linkZoom: asamblea?.linkZoom ?? null
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
