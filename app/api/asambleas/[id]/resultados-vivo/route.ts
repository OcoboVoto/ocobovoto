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

    // ─── Query 1: Datos base de la asamblea (sin relaciones pesadas) ──────────
    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      select: {
        id: true,
        tipo: true,
        modalidad: true,
        estado: true,
        confirmacionActivada: true,
        registrosCerrados: true,
        fechaCierreRegistros: true,
        quorumAlCierreRegistros: true,
        coeficienteCierre: true,
        porcentajeCierre: true,
        votantesCierre: true,
        conjunto: {
          select: {
            nombre: true,
            coeficienteTotal: true,
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

    const coeficienteTotal = Number(asamblea.conjunto.coeficienteTotal)

    // ─── Query 2: Agregados de quórum (SUM en SQL, no en JS) ──────────────────
    // En lugar de traer todos los votantes y reducirlos en JS,
    // dejamos que PostgreSQL haga el SUM.
    const [quorumTodos, quorumConfirmados] = await Promise.all([
      // Suma de coeficientes de TODOS los votantes
      prisma.votante.aggregate({
        where: { asambleaId: id },
        _sum: { coeficienteTotal: true },
        _count: { id: true },
      }),
      // Suma de coeficientes solo de los que confirmaron asistencia
      prisma.votante.aggregate({
        where: { asambleaId: id, confirmoAsistencia: true },
        _sum: { coeficienteTotal: true },
        _count: { id: true },
      }),
    ])

    const coeficienteInicial = Number(quorumTodos._sum.coeficienteTotal ?? 0)
    const votantesIniciales = quorumTodos._count.id
    const quorumInicialPct = coeficienteTotal > 0
      ? (coeficienteInicial / coeficienteTotal) * 100
      : 0

    // Quórum final solo si hubo confirmaciones
    const huboConfirmaciones = quorumConfirmados._count.id > 0
    const coeficienteFinal = Number(quorumConfirmados._sum.coeficienteTotal ?? 0)
    const votantesFinales = quorumConfirmados._count.id
    const quorumFinalPct = huboConfirmaciones && coeficienteTotal > 0
      ? (coeficienteFinal / coeficienteTotal) * 100
      : null

    // Coeficiente disponible para calcular % de votos
    const coeficienteDisponible = (asamblea.confirmacionActivada && huboConfirmaciones)
      ? coeficienteFinal
      : coeficienteInicial

    const totalVotantesActivos = (asamblea.confirmacionActivada && huboConfirmaciones)
      ? votantesFinales
      : votantesIniciales

    // ─── Query 3: Proposiciones activas/cerradas con opciones ─────────────────
    // Solo trae estructura, sin votos (eso lo hacemos en Query 4)
    const proposiciones = await prisma.proposicion.findMany({
      where: {
        asambleaId: id,
        estado: { in: ['activa', 'cerrada'] }
      },
      select: {
        id: true,
        numeroOrden: true,
        titulo: true,
        estado: true,
        opciones: {
          select: { id: true, texto: true, codigo: true, orden: true },
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { numeroOrden: 'asc' }
    })

    // ─── Query 4: Votos agrupados por proposición+opción (1 sola query) ───────
    // En lugar de traer todos los votos con sus relaciones y procesar en JS,
    // agrupamos en SQL. Devuelve solo la suma de coeficientes y count por opción.
    const votosAgrupados = await prisma.voto.groupBy({
      by: ['proposicionId', 'opcionId'],
      where: {
        proposicionId: { in: proposiciones.map(p => p.id) }
      },
      _sum: { coeficienteAplicado: true },
      _count: { id: true },
    })

    // Construir mapa para lookup O(1)
    const votosMap = new Map<string, { coeficiente: number; personas: number }>()
    for (const voto of votosAgrupados) {
      const key = `${voto.proposicionId}:${voto.opcionId}`
      votosMap.set(key, {
        coeficiente: Number(voto._sum.coeficienteAplicado ?? 0),
        personas: voto._count.id,
      })
    }

    // Total de votos por proposición (para calcular "no votaron")
    const votosTotalesPorProposicion = new Map<string, { coeficiente: number; personas: number }>()
    for (const [key, val] of votosMap) {
      const proposicionId = key.split(':')[0]
      const actual = votosTotalesPorProposicion.get(proposicionId) ?? { coeficiente: 0, personas: 0 }
      votosTotalesPorProposicion.set(proposicionId, {
        coeficiente: actual.coeficiente + val.coeficiente,
        personas: actual.personas + val.personas,
      })
    }

    // ─── Construir respuesta final ─────────────────────────────────────────────
    const resultadosProposiciones = proposiciones.map(proposicion => {
      const totales = votosTotalesPorProposicion.get(proposicion.id) ?? { coeficiente: 0, personas: 0 }

      const opciones = proposicion.opciones.map(opcion => {
        const datos = votosMap.get(`${proposicion.id}:${opcion.id}`) ?? { coeficiente: 0, personas: 0 }
        return {
          id: opcion.id,
          texto: opcion.texto,
          codigo: opcion.codigo,
          orden: opcion.orden,
          votos: datos.personas,
          coeficiente: datos.coeficiente,
          porcentaje: coeficienteDisponible > 0
            ? (datos.coeficiente / coeficienteDisponible) * 100
            : 0,
        }
      })

      const coeficienteNoVotado = coeficienteDisponible - totales.coeficiente
      const personasNoVotaron = totalVotantesActivos - totales.personas

      return {
        id: proposicion.id,
        numeroOrden: proposicion.numeroOrden,
        titulo: proposicion.titulo,
        estado: proposicion.estado,
        opciones,
        noVotaron: {
          votos: Math.max(0, personasNoVotaron),
          coeficiente: Math.max(0, coeficienteNoVotado),
          porcentaje: coeficienteDisponible > 0
            ? Math.max(0, (coeficienteNoVotado / coeficienteDisponible) * 100)
            : 0,
        },
        totalVotos: totales.personas,
        totalVotantes: totalVotantesActivos,
        coeficienteVotado: totales.coeficiente,
        coeficienteDisponible,
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
            porcentaje: quorumInicialPct,
            coeficiente: coeficienteInicial,
            votantes: votantesIniciales,
          },
          cierre: asamblea.registrosCerrados ? {
            porcentaje: Number(asamblea.porcentajeCierre ?? 0),
            coeficiente: Number(asamblea.coeficienteCierre ?? 0),
            votantes: asamblea.votantesCierre ?? 0,
          } : null,
          final: quorumFinalPct !== null ? {
            porcentaje: quorumFinalPct,
            coeficiente: coeficienteFinal,
            votantes: votantesFinales,
          } : null,
          confirmacionActivada: asamblea.confirmacionActivada,
          registrosCerrados: asamblea.registrosCerrados,
          quorumAlCierreRegistros: asamblea.quorumAlCierreRegistros
            ? Number(asamblea.quorumAlCierreRegistros)
            : null,
          fechaCierreRegistros: asamblea.fechaCierreRegistros?.toISOString() ?? null,
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
