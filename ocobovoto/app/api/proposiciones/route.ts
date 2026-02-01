import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      asambleaId,
      titulo,
      descripcion,
      tipoPregunta,
      opciones,
      tipoMayoria,
      porcentajeRequerido,
    } = body

    // Obtener el siguiente número de orden
    const ultimaProposicion = await prisma.proposicion.findFirst({
      where: { asambleaId },
      orderBy: { numeroOrden: 'desc' },
    })

    const numeroOrden = ultimaProposicion ? ultimaProposicion.numeroOrden + 1 : 1

    // Crear proposición con opciones en transacción
    const proposicion = await prisma.proposicion.create({
      data: {
        asambleaId,
        numeroOrden,
        titulo,
        descripcion,
        tipoPregunta,
        tipoMayoria,
        porcentajeRequerido,
        estado: 'pendiente',
        opciones: {
          createMany: {
            data: opciones.map((opcion: any, index: number) => ({
              orden: index,
              texto: opcion.texto,
              codigo: opcion.codigo,
            })),
          },
        },
      },
      include: {
        opciones: true,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: proposicion,
      message: 'Proposición creada',
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/proposiciones:', error)

    // Error específico de timeout
    if (error instanceof Error && error.message.includes('Unable to start a transaction')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El servidor está ocupado procesando otras solicitudes. Intenta de nuevo en unos segundos.'
      }, { status: 503 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al crear proposición',
    }, { status: 500 })
  }
}

// GET: Listar proposiciones de una asamblea
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const asambleaId = searchParams.get('asambleaId')

    if (!asambleaId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'asambleaId es requerido'
      }, { status: 400 })
    }

    const proposiciones = await prisma.proposicion.findMany({
      where: { asambleaId },
      include: {
        opciones: {
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { votos: true }
        }
      },
      orderBy: { numeroOrden: 'asc' }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: proposiciones
    })

  } catch (error) {
    console.error('Error en GET /api/proposiciones:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al obtener proposiciones'
    }, { status: 500 })
  }
}