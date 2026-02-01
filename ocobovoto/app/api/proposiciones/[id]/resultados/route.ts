import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const proposicion =  await prisma.proposicion.findUnique({
        where: { id },
        include: {
          opciones: {
            include: {
              votos: {
                include: {
                  votante: true,
                },
              },
            },
          },
          asamblea: {
            include: {
              votantes: true,
            },
          },
        },
      })

    if (!proposicion) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Pregunta no encontrada',
      }, { status: 404 })
    }

    // Calcular totales
    const totalVotantes = proposicion.asamblea.votantes.length
    const coeficienteTotalPresente = proposicion.asamblea.votantes.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    // Calcular por opción
    const resultadosOpciones = proposicion.opciones.map((opcion) => {
      const votosOpcion = opcion.votos
      const coeficienteOpcion = votosOpcion.reduce(
        (sum, v) => sum + Number(v.coeficienteAplicado),
        0
      )
      const personasOpcion = votosOpcion.length

      return {
        opcionId: opcion.id,
        texto: opcion.texto,
        codigo: opcion.codigo,
        coeficiente: coeficienteOpcion,
        porcentaje: (coeficienteOpcion / coeficienteTotalPresente) * 100,
        personas: personasOpcion,
        porcentajePersonas: (personasOpcion / totalVotantes) * 100,
      }
    })

    // Calcular no votaron
    const totalVotos = proposicion.opciones.reduce(
      (sum, opc) => sum + opc.votos.length,
      0
    )
    const coeficienteVotado = resultadosOpciones.reduce(
      (sum, r) => sum + r.coeficiente,
      0
    )
    const coeficienteNoVotado = coeficienteTotalPresente - coeficienteVotado

    // Determinar si aprobó
    const opcionGanadora = resultadosOpciones.reduce((prev, curr) =>
      curr.coeficiente > prev.coeficiente ? curr : prev
    )

    const aprobada = opcionGanadora.porcentaje >= Number(proposicion.porcentajeRequerido)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        proposicion: {
          id: proposicion.id,
          titulo: proposicion.titulo,
          tipoMayoria: proposicion.tipoMayoria,
          porcentajeRequerido: Number(proposicion.porcentajeRequerido),
        },
        resultados: resultadosOpciones,
        noVotaron: {
          coeficiente: coeficienteNoVotado,
          porcentaje: (coeficienteNoVotado / coeficienteTotalPresente) * 100,
          personas: totalVotantes - totalVotos,
        },
        resumen: {
          totalVotantes,
          totalVotos,
          coeficienteTotalPresente,
          aprobada,
          opcionGanadora: opcionGanadora.texto,
        },
      },
    })

  } catch (error) {
    console.error('Error en GET /api/proposiciones/[id]/resultados:', error)

    // Error específico de pool
    if (error instanceof Error && error.message.includes('connection pool')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Servidor ocupado. Reintentando...',
      }, { status: 503 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al calcular resultados',
    }, { status: 500 })
  }
}