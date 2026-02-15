//app/api/asambleas/[id]/resultados-vivo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener asamblea con todas las relaciones necesarias
    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        conjunto: true,
        votantes: {
          include: {
            confirmaciones: true,
          }
        },
        proposiciones: {
          where: {
            estado: { in: ['activa', 'cerrada'] }
          },
          orderBy: {
            numeroOrden: 'asc'
          },
          include: {
            opciones: {
              orderBy: { orden: 'asc' }
            },
            votos: {
              include: {
                opcion: true,
                votante: true
              }
            }
          }
        }
      }
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    // Calcular coeficiente total del conjunto
    const coeficienteTotal = Number(asamblea.conjunto.coeficienteTotal)

    // Calcular quorum inicial (todos los votantes registrados)
    const coeficienteInicial = asamblea.votantes.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )
    const quorumInicial = (coeficienteInicial / coeficienteTotal) * 100
    const votantesIniciales = asamblea.votantes.length

    // Calcular quorum final (solo los que confirmaron asistencia)
    let quorumFinal = null
    let votantesFinales = votantesIniciales
    let coeficienteFinal = coeficienteInicial

    //verificar si ALGUNA VEZ hubo confirmaciones, no solo si está activa
    const huboConfirmaciones = asamblea.votantes.some(v => v.confirmoAsistencia)

    if (asamblea.confirmacionActivada || huboConfirmaciones) {
      const votantesConfirmados = asamblea.votantes.filter(
        v => v.confirmoAsistencia
      )
      coeficienteFinal = votantesConfirmados.reduce(
        (sum, v) => sum + Number(v.coeficienteTotal),
        0
      )
      quorumFinal = (coeficienteFinal / coeficienteTotal) * 100
      votantesFinales = votantesConfirmados.length
    }

    // Procesar resultados de cada proposición
    const resultadosProposiciones = asamblea.proposiciones.map(proposicion => {
      const totalVotantes = asamblea.confirmacionActivada
        ? asamblea.votantes.filter(v => v.confirmoAsistencia).length
        : asamblea.votantes.length

      const coeficienteDisponible = asamblea.confirmacionActivada
        ? coeficienteFinal
        : coeficienteInicial

      // Calcular resultados por opción
      const resultadosOpciones = proposicion.opciones.map(opcion => {
        const votosOpcion = proposicion.votos.filter(v => v.opcionId === opcion.id)
        const coeficienteOpcion = votosOpcion.reduce(
          (sum, v) => sum + Number(v.coeficienteAplicado),
          0
        )
        const personasOpcion = votosOpcion.length

        return {
          id: opcion.id,
          texto: opcion.texto,
          codigo: opcion.codigo,
          orden: opcion.orden,
          votos: personasOpcion,
          coeficiente: coeficienteOpcion,
          porcentaje: coeficienteDisponible > 0
            ? (coeficienteOpcion / coeficienteDisponible) * 100
            : 0,
        }
      })

      // Calcular coeficiente que votó (suma de todos los votos)
      const coeficienteVotado = resultadosOpciones.reduce(
        (sum, r) => sum + r.coeficiente,
        0
      )

      // Calcular coeficiente que NO votó
      const coeficienteNoVotado = coeficienteDisponible - coeficienteVotado
      const porcentajeNoVotado = coeficienteDisponible > 0
        ? (coeficienteNoVotado / coeficienteDisponible) * 100
        : 0

      const personasVotaron = proposicion.votos.length
      const personasNoVotaron = totalVotantes - personasVotaron

      return {
        id: proposicion.id,
        numeroOrden: proposicion.numeroOrden,
        titulo: proposicion.titulo,
        estado: proposicion.estado,
        opciones: resultadosOpciones,
        noVotaron: {
          votos: personasNoVotaron,
          coeficiente: coeficienteNoVotado,
          porcentaje: porcentajeNoVotado,
        },
        totalVotos: personasVotaron,
        totalVotantes: totalVotantes,
        coeficienteVotado, // Coeficiente SOLO de quienes votaron
        coeficienteDisponible, // Coeficiente total disponible
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        asamblea: {
          id: asamblea.id,
          tipo: asamblea.tipo,
          modalidad: asamblea.modalidad,
          estado: asamblea.estado,
          conjunto: {
            nombre: asamblea.conjunto.nombre,
            coeficienteTotal,
          },
        },
        quorum: {
          inicial: {
            porcentaje: quorumInicial,
            coeficiente: coeficienteInicial,
            votantes: votantesIniciales,
          },
          final: quorumFinal !== null ? {
            porcentaje: quorumFinal,
            coeficiente: coeficienteFinal,
            votantes: votantesFinales,
          } : null,
          confirmacionActivada: asamblea.confirmacionActivada,
        },
        proposiciones: resultadosProposiciones,
      },
    })

  } catch (error) {
    console.error('Error en GET /api/asambleas/[id]/resultados-vivo:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al obtener resultados en vivo',
    }, { status: 500 })
  }
}