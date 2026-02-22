//lib/reportes/get-asamblea-reporte.ts
import { prisma } from '@/lib/prisma'

export interface ReporteAsambleaData {
    asamblea: {
        id: string
        tipo: string
        fechaHora: Date
        modalidad: string
        estado: string
        quorumRequerido: number
        quorumInicial: number
        quorumFinal: number | null
        confirmacionActivada: boolean
        registrosCerrados: boolean
        quorumAlCierreRegistros: number | null
        fechaCierreRegistros: Date | null
    }
    conjunto: {
        nombre: string
        nit: string
    }
    asistentes: {
        nombreCompleto: string
        torreManzana: string
        aptoCasa: string
        coeficiente: number
    }[]
    noAsistentes: {
        nombreCompleto: string
        torreManzana: string
        aptoCasa: string
    }[]
    proposiciones: {
        id: string
        numeroOrden: number
        titulo: string
        descripcion: string | null
        tipoMayoria: string
        porcentajeRequerido: number
        opciones: {
            texto: string
            codigo: string
            coeficiente: number
            porcentaje: number
            personas: number
        }[]
        noVotaron: {
            coeficiente: number
            porcentaje: number
            personas: number
        }
        aprobada: boolean
        opcionGanadora: string
    }[]
    poderes: {
        id: string
        otorgante: {
            nombreCompleto: string
            cedula: string
            torreManzana: string
            aptoCasa: string
            coeficiente: number
        }
        apoderado: {
            nombreCompleto: string
            cedula: string
        }
        fechaRegistro: Date
    }[]
    resumen: {
        totalPropietarios: number
        totalAsistentes: number
        totalNoAsistentes: number
        totalProposiciones: number
        totalPoderes: number
    }
}

export async function getAsambleaReporteData(id: string): Promise<ReporteAsambleaData | null> {
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
            poderes: {
                where: { activo: true },
                include: {
                    propietarioOtorgante: {
                        select: {
                            id: true,
                            nombreCompleto: true,
                            cedula: true,
                            torreManzana: true,
                            aptoCasa: true,
                            coeficiente: true,
                        },
                    },
                },
                orderBy: { fechaRegistro: 'asc' },
            },
        },
    })

    if (!asamblea) return null

    const todosPropietarios = await prisma.propietario.findMany({
        where: {
            conjuntoId: asamblea.conjuntoId,
            activo: true,
        },
        orderBy: [{ torreManzana: 'asc' }, { aptoCasa: 'asc' }],
    })

    const cedulasAsistentes = new Set(asamblea.votantes.map(v => v.cedula))
    const asistentes = todosPropietarios.filter(p => cedulasAsistentes.has(p.cedula))
    const noAsistentes = todosPropietarios.filter(p => !cedulasAsistentes.has(p.cedula))

    const resultadosProposiciones = asamblea.proposiciones.map((prop) => {
        const totalVotantes = asamblea.votantes.length
        const coeficienteTotalPresente = asamblea.votantes.reduce(
            (sum, v) => sum + Number(v.coeficienteTotal),
            0,
        )

        const resultadosOpciones = prop.opciones.map((opcion) => {
            const votosOpcion = opcion.votos
            const coeficienteOpcion = votosOpcion.reduce(
                (sum, v) => sum + Number(v.coeficienteAplicado),
                0,
            )

            return {
                texto: opcion.texto,
                codigo: opcion.codigo,
                coeficiente: coeficienteOpcion,
                porcentaje: coeficienteTotalPresente > 0
                    ? (coeficienteOpcion / coeficienteTotalPresente) * 100
                    : 0,
                personas: votosOpcion.length,
            }
        })

        const totalVotos = prop.opciones.reduce((sum, opc) => sum + opc.votos.length, 0)
        const coeficienteVotado = resultadosOpciones.reduce((sum, r) => sum + r.coeficiente, 0)
        const coeficienteNoVotado = coeficienteTotalPresente - coeficienteVotado

        const opcionGanadora = resultadosOpciones.reduce((prev, curr) =>
            curr.coeficiente > prev.coeficiente ? curr : prev,
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
                porcentaje: coeficienteTotalPresente > 0
                    ? (coeficienteNoVotado / coeficienteTotalPresente) * 100
                    : 0,
                personas: totalVotantes - totalVotos,
            },
            aprobada,
            opcionGanadora: opcionGanadora?.texto || '',
        }
    })

    const poderesFormateados = asamblea.poderes.map(p => ({
        id: p.id,
        otorgante: {
            nombreCompleto: p.propietarioOtorgante.nombreCompleto,
            cedula: p.propietarioOtorgante.cedula,
            torreManzana: p.propietarioOtorgante.torreManzana,
            aptoCasa: p.propietarioOtorgante.aptoCasa,
            coeficiente: Number(p.propietarioOtorgante.coeficiente),
        },
        apoderado: {
            nombreCompleto: p.nombreApoderado,
            cedula: p.cedulaApoderado,
        },
        fechaRegistro: p.fechaRegistro,
    }))

    return {
        asamblea: {
            id: asamblea.id,
            tipo: asamblea.tipo,
            fechaHora: asamblea.fechaHora,
            modalidad: asamblea.modalidad,
            estado: asamblea.estado,
            quorumRequerido: Number(asamblea.quorumRequerido),
            quorumInicial: Number(asamblea.quorumInicial),
            quorumFinal: asamblea.quorumFinal ? Number(asamblea.quorumFinal) : null,
            confirmacionActivada: asamblea.confirmacionActivada,
            registrosCerrados: (asamblea as any).registrosCerrados ?? false,
            quorumAlCierreRegistros: (asamblea as any).quorumAlCierreRegistros
                ? Number((asamblea as any).quorumAlCierreRegistros)
                : null,
            fechaCierreRegistros: (asamblea as any).fechaCierreRegistros ?? null,
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
        poderes: poderesFormateados,
        resumen: {
            totalPropietarios: todosPropietarios.length,
            totalAsistentes: asistentes.length,
            totalNoAsistentes: noAsistentes.length,
            totalProposiciones: asamblea.proposiciones.length,
            totalPoderes: poderesFormateados.length,
        },
    }
}
