// app/api/registro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RegistroRequest {
  asambleaId: string
  cedula: string
  nombreCompleto: string
  modalidadAsistencia: string
  poderes?: Array<{
    propietarioId: string
    nombre: string
  }>
}

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegistroRequest = await request.json()
    const { asambleaId, cedula, nombreCompleto, modalidadAsistencia, poderes = [] } = body

    // Validaciones
    if (!asambleaId || !cedula || !nombreCompleto) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Faltan campos requeridos'
      }, { status: 400 })
    }

    // Verificar que la asamblea existe y está activa
    const asamblea = await prisma.asamblea.findUnique({
      where: { id: asambleaId },
      include: {
        conjunto: true
      }
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada'
      }, { status: 404 })
    }

    if (asamblea.estado !== 'activa') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'La asamblea no está activa'
      }, { status: 400 })
    }

    // Verificar si ya está registrado
    const registroExistente = await prisma.votante.findUnique({
      where: {
        asambleaId_cedula: {
          asambleaId,
          cedula
        }
      }
    })

    if (registroExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Esta cédula ya está registrada en esta asamblea'
      }, { status: 400 })
    }

    // Obtener propietarios para calcular coeficiente
    const propietariosPrincipales = await prisma.propietario.findMany({
      where: {
        conjuntoId: asamblea.conjuntoId,
        cedula
      }
    })

    if (propietariosPrincipales.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No se encontró ningún propietario con esta cédula'
      }, { status: 404 })
    }

    // Calcular coeficiente total (propios + poderes)
    let coeficienteTotal = propietariosPrincipales.reduce(
      (sum, p) => sum + Number(p.coeficiente),
      0
    )
    
    let propietariosRepresentados = propietariosPrincipales.map(p => ({
      id: p.id,
      nombre: p.nombreCompleto,
      coeficiente: Number(p.coeficiente),
      unidad: `${p.torreManzana} ${p.aptoCasa}`
    }))

    // Si hay poderes, sumar sus coeficientes
    if (poderes.length > 0) {
      const propietariosPoderes = await prisma.propietario.findMany({
        where: {
          conjuntoId: asamblea.conjuntoId,
          id: { in: poderes.map(p => p.propietarioId) }
        }
      })

      for (const prop of propietariosPoderes) {
        coeficienteTotal += Number(prop.coeficiente)
        propietariosRepresentados.push({
          id: prop.id,
          nombre: prop.nombreCompleto,
          coeficiente: Number(prop.coeficiente),
          unidad: `${prop.torreManzana} ${prop.aptoCasa}`
        })
      }
    }

    //Transacción final
    const resultado = await prisma.$transaction(async (tx) => {
        // Crear votante
        const votante = await tx.votante.create({
          data: {
            asambleaId,
            cedula,
            nombreCompleto,
            coeficienteTotal,
            propietariosRepresenta: propietariosRepresentados.length,
            detalleRepresentados: propietariosRepresentados
          }
        })

        // Crear registros de asamblea para cada propietario
        const registros = await Promise.all(
          propietariosPrincipales.map(prop =>
            tx.registroAsamblea.create({
              data: {
                asambleaId,
                propietarioId: prop.id,
                cedulaRegistrante: cedula,
                modalidadAsistencia: modalidadAsistencia,
                poderesRepresentados: poderes.map(p => p.propietarioId)
              }
            })
          )
        )

        // Crear poderes si existen
        if (poderes.length > 0) {
          await Promise.all(
            poderes.map(poder =>
              tx.poder.create({
                data: {
                  propietarioOtorganteId: poder.propietarioId,
                  asambleaId,
                  cedulaApoderado: cedula,
                  nombreApoderado: nombreCompleto,
                  activo: true
                }
              })
            )
          )
        }

        return { votante, registros }
      },
      {
        maxWait: 10000, // 10 segundos de espera máxima
        timeout: 20000, // 20 segundos de timeout
      }
    )

    // Recalcular quórum
    const todosVotantes = await prisma.votante.findMany({
      where: { asambleaId }
    })

    const coeficientePresente = todosVotantes.reduce(
      (sum, v) => sum + Number(v.coeficienteTotal),
      0
    )

    const quorumInicial = (coeficientePresente / Number(asamblea.conjunto.coeficienteTotal)) * 100

    // Actualizar quórum en asamblea
    await prisma.asamblea.update({
      where: { id: asambleaId },
      data: { quorumInicial }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        votante: resultado.votante,
        quorumActual: quorumInicial.toFixed(2)
      }
    })

  } catch (error) {
    console.error('Error en POST /api/registro:', error)
    
    // Error específico de timeout
    if (error instanceof Error && error.message.includes('Unable to start a transaction')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El servidor está ocupado. Por favor intenta de nuevo en unos segundos.'
      }, { status: 503 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al registrar votante'
    }, { status: 500 })
  }
}