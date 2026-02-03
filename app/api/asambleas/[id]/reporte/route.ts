import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener asamblea completa
    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        conjunto: true,
        votantes: {
          orderBy: { nombreCompleto: 'asc' },
        },
        proposiciones: {
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
          },
          orderBy: { numeroOrden: 'asc' },
        },
      },
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    // Obtener todos los propietarios del conjunto
    const todosPropietarios = await prisma.propietario.findMany({
      where: {
        conjuntoId: asamblea.conjuntoId,
        activo: true,
      },
      orderBy: [
        { torreManzana: 'asc' },
        { aptoCasa: 'asc' },
      ],
    })

    // Separar asistentes y no asistentes
    const cedulasAsistentes = new Set(asamblea.votantes.map(v => v.cedula))
    const asistentes = todosPropietarios.filter(p => cedulasAsistentes.has(p.cedula))
    const noAsistentes = todosPropietarios.filter(p => !cedulasAsistentes.has(p.cedula))

    // Calcular resultados por proposición
    const resultadosProposiciones = await Promise.all(
      asamblea.proposiciones.map(async (prop) => {
        const totalVotantes = asamblea.votantes.length
        const coeficienteTotalPresente = asamblea.votantes.reduce(
          (sum, v) => sum + Number(v.coeficienteTotal),
          0
        )

        const resultadosOpciones = prop.opciones.map((opcion) => {
          const votosOpcion = opcion.votos
          const coeficienteOpcion = votosOpcion.reduce(
            (sum, v) => sum + Number(v.coeficienteAplicado),
            0
          )

          return {
            texto: opcion.texto,
            codigo: opcion.codigo,
            coeficiente: coeficienteOpcion,
            porcentaje: (coeficienteOpcion / coeficienteTotalPresente) * 100,
            personas: votosOpcion.length,
          }
        })

        const totalVotos = prop.opciones.reduce((sum, opc) => sum + opc.votos.length, 0)
        const coeficienteVotado = resultadosOpciones.reduce((sum, r) => sum + r.coeficiente, 0)
        const coeficienteNoVotado = coeficienteTotalPresente - coeficienteVotado

        const opcionGanadora = resultadosOpciones.reduce((prev, curr) =>
          curr.coeficiente > prev.coeficiente ? curr : prev
        )

        const aprobada = opcionGanadora.porcentaje >= Number(prop.porcentajeRequerido)

        return {
          id: prop.id,
          numeroOrden: prop.numeroOrden,
          titulo: prop.titulo,
          descripcion: prop.descripcion,
          tipoMayoria: prop.tipoMayoria,
          porcentajeRequerido: Number(prop.porcentajeRequerido),
          opciones: resultadosOpciones,
          noVotaron: {
            coeficiente: coeficienteNoVotado,
            porcentaje: (coeficienteNoVotado / coeficienteTotalPresente) * 100,
            personas: totalVotantes - totalVotos,
          },
          aprobada,
          opcionGanadora: opcionGanadora.texto,
        }
      })
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        asamblea: {
          id: asamblea.id,
          tipo: asamblea.tipo,
          fechaHora: asamblea.fechaHora,
          modalidad: asamblea.modalidad,
          estado: asamblea.estado,
          quorumRequerido: Number(asamblea.quorumRequerido),
          quorumInicial: Number(asamblea.quorumInicial),
          quorumFinal: asamblea.quorumFinal ? Number(asamblea.quorumFinal) : null,
        },
        conjunto: {
          nombre: asamblea.conjunto.nombre,
          nit: asamblea.conjunto.nit,
        },
        asistentes: asistentes.map(a => ({
          nombreCompleto: a.nombreCompleto,
          torreManzana: a.torreManzana,
          aptoCasa: a.aptoCasa,
          coeficiente: Number(a.coeficiente),
        })),
        noAsistentes: noAsistentes.map(a => ({
          nombreCompleto: a.nombreCompleto,
          torreManzana: a.torreManzana,
          aptoCasa: a.aptoCasa,
        })),
        proposiciones: resultadosProposiciones,
        resumen: {
          totalPropietarios: todosPropietarios.length,
          totalAsistentes: asistentes.length,
          totalNoAsistentes: noAsistentes.length,
          totalProposiciones: asamblea.proposiciones.length,
        },
      },
    })

  } catch (error) {
    console.error('Error en GET /api/asambleas/[id]/reporte:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al generar reporte',
    }, { status: 500 })
  }
}