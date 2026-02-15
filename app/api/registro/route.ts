import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedula, nombre, modalidadAsistencia } = body

    //console.log('Iniciando registro:', { asambleaId, cedula })

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

    // Buscar propietario por cédula
    const propietario = await prisma.propietario.findFirst({
      where: { cedula },
      select: {
        id: true,
        cedula: true,
        nombreCompleto: true,
        coeficiente: true,
      }
    })

    if (!propietario) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Propietario no encontrado con esa cédula',
      }, { status: 404 })
    }

   // console.log('Propietario encontrado:', propietario.nombreCompleto)

    // Verificar si ya está registrado
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
          }
        }
      },
    })

   // console.log('Poderes recibidos:', poderesRecibidos.length)

    // Calcular coeficiente total (propio + poderes recibidos)
    let coeficienteTotal = Number(propietario.coeficiente)
    const detalleRepresentados = [
      {
        id: propietario.id,
        cedula: propietario.cedula,
        nombre: propietario.nombreCompleto,
        coeficiente: Number(propietario.coeficiente),
        esPropietario: true,
      },
    ]

    // Sumar coeficientes de los poderes recibidos
    poderesRecibidos.forEach((poder) => {
      const coefPoder = Number(poder.propietarioOtorgante.coeficiente)
      coeficienteTotal += coefPoder
      
      detalleRepresentados.push({
        id: poder.propietarioOtorgante.id,
        cedula: poder.propietarioOtorgante.cedula,
        nombre: poder.propietarioOtorgante.nombreCompleto,
        coeficiente: coefPoder,
        esPropietario: false,
      })

      //console.log(` Poder de ${poder.propietarioOtorgante.nombreCompleto}: +${coefPoder}%`)
    })

   // console.log('Coeficiente total calculado:', coeficienteTotal)

    // OPTIMIZACIÓN: Usar transacción + aggregate en lugar de findMany
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear votante y registro
      const votante = await tx.votante.create({
        data: {
          asambleaId,
          cedula,
          nombreCompleto: nombre || propietario.nombreCompleto,
          coeficienteTotal,
          propietariosRepresenta: detalleRepresentados.length,
          detalleRepresentados,
        },
      })

      await tx.registroAsamblea.create({
        data: {
          asambleaId,
          propietarioId: propietario.id,
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

     // console.log('Registro completado - Quórum:', quorumInicial.toFixed(2), '%')

      return { votante, quorumActual: quorumInicial }
    })

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