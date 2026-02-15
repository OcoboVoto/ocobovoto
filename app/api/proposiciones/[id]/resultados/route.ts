//app/api/propisciones/[id]/resultados/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    //Traer proposición SIN votos
    const proposicion = await prisma.proposicion.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        tipoMayoria: true,
        porcentajeRequerido: true,
        asambleaId: true,
        asamblea: {
          select: {
            id: true,
            _count: {
              select: { votantes: true },
            },
            votantes: {
              select: {
                coeficienteTotal: true,
              },
            },
          },
        },
      },
    })

    if (!proposicion) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Pregunta no encontrada' },
        { status: 404 }
      )
    }

    //Total votantes
    const totalVotantes = proposicion.asamblea._count.votantes

    const coeficienteTotalPresente = proposicion.asamblea.votantes.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    //Agrupar votos por opción (TODO EN DB)
    const votosAgrupados = await prisma.voto.groupBy({
      by: ['opcionId'],
      where: {
        opcion: {
          proposicionId: id,
        },
      },
      _sum: {
        coeficienteAplicado: true,
      },
      _count: {
        _all: true,
      },
    })

    //Traer opciones
    const opciones = await prisma.opcionRespuesta.findMany({
      where: { proposicionId: id },
      select: {
        id: true,
        texto: true,
        codigo: true,
      },
    })

    //Mapear resultados
    const resultados = opciones.map((opcion) => {
      const voto = votosAgrupados.find(v => v.opcionId === opcion.id)

      const coeficiente = Number(voto?._sum.coeficienteAplicado ?? 0)
      const personas = voto?._count._all ?? 0

      return {
        opcionId: opcion.id,
        texto: opcion.texto,
        codigo: opcion.codigo,
        coeficiente,
        porcentaje:
          coeficienteTotalPresente > 0
            ? (coeficiente / coeficienteTotalPresente) * 100
            : 0,
        personas,
        porcentajePersonas:
          totalVotantes > 0
            ? (personas / totalVotantes) * 100
            : 0,
      }
    })

    //Cálculo no votaron
    const totalVotos = resultados.reduce(
      (sum, r) => sum + r.personas,
      0
    )

    const coeficienteVotado = resultados.reduce(
      (sum, r) => sum + r.coeficiente,
      0
    )

    const coeficienteNoVotado =
      coeficienteTotalPresente - coeficienteVotado

    //Opción ganadora
    let aprobada = false
    let opcionGanadora: string | null = null
    let hayEmpate = false
    let sinVotos = false

    if (totalVotos === 0) {
      //Caso A: nadie votó
      sinVotos = true
      aprobada = false
      opcionGanadora = null
    } else {
      const maxCoef = Math.max(...resultados.map(r => r.coeficiente))

      const opcionesMaximas = resultados.filter(
        r => r.coeficiente === maxCoef && r.coeficiente > 0
      )

      if (opcionesMaximas.length > 1) {
        // Caso B: empate real
        hayEmpate = true
        aprobada = false
        opcionGanadora = null
      } else if (opcionesMaximas.length === 1) {
        // Caso C: ganador único
        const ganadora = opcionesMaximas[0]

        opcionGanadora = ganadora.texto
        aprobada =
          ganadora.porcentaje >=
          Number(proposicion.porcentajeRequerido)
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        proposicion: {
          id: proposicion.id,
          titulo: proposicion.titulo,
          tipoMayoria: proposicion.tipoMayoria,
          porcentajeRequerido: Number(proposicion.porcentajeRequerido),
        },
        resultados,
        noVotaron: {
          coeficiente: coeficienteNoVotado,
          porcentaje:
            coeficienteTotalPresente > 0
              ? (coeficienteNoVotado / coeficienteTotalPresente) * 100
              : 0,
          personas: totalVotantes - totalVotos,
        },
        resumen: {
          totalVotantes,
          totalVotos,
          coeficienteTotalPresente,
          aprobada,
          opcionGanadora,
          hayEmpate,
          sinVotos
        },
      },
    })
  } catch (error) {
    console.error('Error en GET resultados:', error)

    if (error instanceof Error && error.message.includes('connection pool')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Servidor ocupado. Reintentando...' },
        { status: 503 }
      )
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error al calcular resultados' },
      { status: 500 }
    )
  }
}
