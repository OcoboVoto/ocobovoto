// app/api/registro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { publishToChannel } from '@/lib/ably/server'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedula, nombre, nombreCompleto, modalidadAsistencia } = body

    console.log('Iniciando registro:', { asambleaId, cedula })

    // Verificar que la asamblea existe y está activa
    const asamblea = await prisma.asamblea.findUnique({
      where: { id: asambleaId },
      select: {
        id: true,
        estado: true,
        conjunto: {
          select: {
            id: true,
            coeficienteTotal: true,
          }
        }
      },
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    if (asamblea.estado !== 'activa') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'La asamblea no está activa',
      }, { status: 400 })
    }

    // Verificar si ya está registrado (aplica tanto para propietarios como externos)
    const registroExistente = await prisma.votante.findUnique({
      where: {
        asambleaId_cedula: {
          asambleaId,
          cedula,
        },
      },
    })

    if (registroExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Ya estás registrado en esta asamblea',
      }, { status: 400 })
    }

    // Buscar TODOS los propietarios con esa cédula en el conjunto
    const propietarios = await prisma.propietario.findMany({
      where: {
        cedula,
        conjuntoId: asamblea.conjunto.id,
        activo: true,
      },
      select: {
        id: true,
        cedula: true,
        nombreCompleto: true,
        coeficiente: true,
        torreManzana: true,
        aptoCasa: true,
      },
    })

    // ─────────────────────────────────────────────────────────────────────────
    // CASO: Apoderado externo (no es propietario del conjunto)
    // ─────────────────────────────────────────────────────────────────────────
    if (propietarios.length === 0) {
      // Buscar poderes donde esta cédula es el apoderado externo
      const poderesExternos = await prisma.poder.findMany({
        where: {
          cedulaApoderado: cedula,
          asambleaId,
          activo: true,
        },
        include: {
          propietarioOtorgante: {
            select: {
              id: true,
              cedula: true,
              nombreCompleto: true,
              coeficiente: true,
              torreManzana: true,
              aptoCasa: true,
            }
          }
        },
      })

      // No es propietario y tampoco tiene poderes → error final
      if (poderesExternos.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Cédula no encontrada. No es propietario del conjunto ni tiene poderes registrados para esta asamblea.',
        }, { status: 404 })
      }

      // Verificar que ningún otorgante esté ya registrado como votante
      const otorgantesRegistrados = await prisma.votante.findMany({
        where: {
          asambleaId,
          cedula: {
            in: poderesExternos.map(p => p.propietarioOtorgante.cedula),
          },
        },
        select: { cedula: true, nombreCompleto: true },
      })

      if (otorgantesRegistrados.length > 0) {
        const nombres = otorgantesRegistrados.map(r => r.nombreCompleto).join(', ')
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Los siguientes otorgantes ya están registrados directamente: ${nombres}. No puedes usar sus poderes.`,
        }, { status: 400 })
      }

      // Calcular coeficiente total y construir detalle
      let coeficienteTotal = 0
      const detalleRepresentados: any[] = []

      poderesExternos.forEach((poder) => {
        const coef = Number(poder.propietarioOtorgante.coeficiente)
        coeficienteTotal += coef
        detalleRepresentados.push({
          id: poder.propietarioOtorgante.id,
          cedula: poder.propietarioOtorgante.cedula,
          nombre: poder.propietarioOtorgante.nombreCompleto,
          unidad: `${poder.propietarioOtorgante.torreManzana}-${poder.propietarioOtorgante.aptoCasa}`,
          coeficiente: coef,
          esPropietario: false,
          esPoder: true,
        })
        console.log(` Poder externo de ${poder.propietarioOtorgante.nombreCompleto}: +${coef}%`)
      })

      const nombreApoderado = nombreCompleto || nombre || poderesExternos[0].nombreApoderado

      console.log(`Apoderado externo ${nombreApoderado}: ${poderesExternos.length} poder(es), coef. total: ${coeficienteTotal.toFixed(4)}%`)

      // Registrar como votante externo en transacción
      const resultado = await prisma.$transaction(async (tx) => {
        const votante = await tx.votante.create({
          data: {
            asambleaId,
            cedula,
            nombreCompleto: nombreApoderado,
            coeficienteTotal,
            propietariosRepresenta: poderesExternos.length,
            detalleRepresentados,
            //modalidadAsistencia: modalidadAsistencia || 'presencial',
          },
        })

        // Nota: No creamos RegistroAsamblea para externos ya que requiere propietarioId.
        // El votante queda registrado en la tabla Votante con detalleRepresentados.

        // Recalcular quórum
        const sumCoeficientes = await tx.votante.aggregate({
          where: { asambleaId },
          _sum: { coeficienteTotal: true },
        })

        const coeficientePresente = Number(sumCoeficientes._sum.coeficienteTotal || 0)
        const coeficienteTotalConjunto = Number(asamblea.conjunto.coeficienteTotal)
        const quorumInicial = (coeficientePresente / coeficienteTotalConjunto) * 100

        await tx.asamblea.update({
          where: { id: asambleaId },
          data: { quorumInicial },
        })

        console.log('Registro externo completado - Quórum:', quorumInicial.toFixed(2), '%')

        return { votante, quorumActual: quorumInicial }
      })

      // Notificar en tiempo real
      await publishToChannel(
        ABLY_CHANNELS.asamblea(asambleaId),
        ABLY_EVENTS.ASAMBLEA_UPDATE,
        {
          tipo: 'nuevo-registro',
          quorumActual: resultado.quorumActual,
          timestamp: new Date().toISOString(),
        }
      )

      return NextResponse.json<ApiResponse>({
        success: true,
        data: resultado,
        message: `Apoderado externo registrado con ${poderesExternos.length} poder(es)`,
      }, { status: 201 })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASO: Es propietario del conjunto (flujo original sin cambios)
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`Propietario encontrado: ${propietarios[0].nombreCompleto} con ${propietarios.length} propiedad(es)`)

    // Buscar qué unidades de este propietario ya tienen poder OTORGADO a otra persona
    // (no deben sumarse al coeficiente propio, pues el poder ya fue transferido)
    const poderesOtorgadosPropios = await prisma.poder.findMany({
      where: {
        propietarioOtorganteId: { in: propietarios.map(p => p.id) },
        asambleaId,
        activo: true,
      },
      select: { propietarioOtorganteId: true },
    })
    const unidadesConPoderOtorgado = new Set(poderesOtorgadosPropios.map(p => p.propietarioOtorganteId))

    // Buscar poderes otorgados A ESTA PERSONA (donde ella es apoderada)
    const poderesRecibidos = await prisma.poder.findMany({
      where: {
        asambleaId,
        cedulaApoderado: cedula,
        activo: true,
      },
      select: {
        id: true,
        propietarioOtorgante: {
          select: {
            id: true,
            cedula: true,
            nombreCompleto: true,
            coeficiente: true,
            torreManzana: true,
            aptoCasa: true,
          }
        }
      },
    })

    console.log('Poderes recibidos:', poderesRecibidos.length)
    console.log('Unidades propias con poder ya otorgado a otros:', unidadesConPoderOtorgado.size)

    // Calcular coeficiente total
    // REGLA: solo cuentan las unidades propias SIN poder otorgado + los poderes recibidos
    let coeficienteTotal = 0
    const detalleRepresentados: any[] = []

    // Sumar solo las propiedades que NO delegaron su poder a alguien más
    const propiedadesActivas = propietarios.filter(p => !unidadesConPoderOtorgado.has(p.id))
    propiedadesActivas.forEach((prop) => {
      const coefProp = Number(prop.coeficiente)
      coeficienteTotal += coefProp

      detalleRepresentados.push({
        id: prop.id,
        cedula: prop.cedula,
        nombre: prop.nombreCompleto,
        unidad: `${prop.torreManzana}-${prop.aptoCasa}`,
        coeficiente: coefProp,
        esPropietario: true,
      })
    })

    console.log(`Coeficiente propio (${propiedadesActivas.length} unidades activas de ${propietarios.length} totales): ${coeficienteTotal}`)

    // Sumar coeficientes de los poderes recibidos
    poderesRecibidos.forEach((poder) => {
      const coefPoder = Number(poder.propietarioOtorgante.coeficiente)
      coeficienteTotal += coefPoder

      detalleRepresentados.push({
        id: poder.propietarioOtorgante.id,
        cedula: poder.propietarioOtorgante.cedula,
        nombre: poder.propietarioOtorgante.nombreCompleto,
        unidad: `${poder.propietarioOtorgante.torreManzana}-${poder.propietarioOtorgante.aptoCasa}`,
        coeficiente: coefPoder,
        esPropietario: false,
      })

      console.log(` Poder de ${poder.propietarioOtorgante.nombreCompleto}: +${coefPoder}%`)
    })

    console.log('Coeficiente total calculado:', coeficienteTotal)

    // OPTIMIZACIÓN: Usar transacción + aggregate
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear votante y registro
      const votante = await tx.votante.create({
        data: {
          asambleaId,
          cedula,
          nombreCompleto: nombreCompleto || nombre || propietarios[0].nombreCompleto,
          coeficienteTotal,
          propietariosRepresenta: detalleRepresentados.length,
          detalleRepresentados,
          //modalidadAsistencia: modalidadAsistencia || 'presencial',
        },
      })

      await tx.registroAsamblea.create({
        data: {
          asambleaId,
          propietarioId: propietarios[0].id,
          cedulaRegistrante: cedula,
          modalidadAsistencia,
          poderesRepresentados: poderesRecibidos.map((p) => p.id),
        },
      })

      // OPTIMIZACIÓN CRÍTICA: Usar aggregate en lugar de findMany
      const sumCoeficientes = await tx.votante.aggregate({
        where: { asambleaId },
        _sum: {
          coeficienteTotal: true,
        },
      })

      const coeficientePresente = Number(sumCoeficientes._sum.coeficienteTotal || 0)
      const coeficienteTotalConjunto = Number(asamblea.conjunto.coeficienteTotal)
      const quorumInicial = (coeficientePresente / coeficienteTotalConjunto) * 100

      await tx.asamblea.update({
        where: { id: asambleaId },
        data: { quorumInicial },
      })

      console.log('Registro completado - Quórum:', quorumInicial.toFixed(2), '%')

      return { votante, quorumActual: quorumInicial }
    })

    // Publicar en Ably: notificar al admin que hay un nuevo votante registrado
    await publishToChannel(
      ABLY_CHANNELS.asamblea(asambleaId),
      ABLY_EVENTS.ASAMBLEA_UPDATE,
      {
        tipo: 'nuevo-registro',
        quorumActual: resultado.quorumActual,
        timestamp: new Date().toISOString(),
      }
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: resultado,
      message: 'Registro exitoso',
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/registro:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al registrar',
    }, { status: 500 })
  }
}