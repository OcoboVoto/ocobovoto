import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { serializeAsamblea } from '@/lib/utils/serialize-decimal'

// GET: Obtener asamblea por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        conjunto: {
          select: { nombre: true, coeficienteTotal: true },
        },
        proposiciones: {
          orderBy: { numeroOrden: 'desc' },
          include: {
            opciones: { orderBy: { orden: 'asc' } },
          },
        },
        votantes: {
          select: {
            id: true,
            cedula: true,
            nombreCompleto: true,
            coeficienteTotal: true,
            propietariosRepresenta: true,
            confirmoAsistencia: true,
            horaConfirmacion: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            registros: true,
            votantes: true,
          },
        },
      },
    })

    if (!asamblea) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    const serialized = serializeAsamblea(asamblea)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: serialized,
    })
  } catch (error) {
    console.error('Error en GET /api/asambleas/[id]:', error)

    // Error específico de pool
    if (error instanceof Error && error.message.includes('connection pool')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Servidor ocupado. Reintentando...',
      }, { status: 503 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno',
    }, { status: 500 })
  }
}

// PATCH: Actualizar estado de asamblea
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { estado } = body

    const asamblea = await prisma.asamblea.update({
      where: { id },
      data: { estado }
    })


    return NextResponse.json<ApiResponse>({
      success: true,
      data: asamblea,
      message: 'Asamblea actualizada',
    })
  } catch (error) {
    console.error('Error en PATCH /api/asambleas/[id]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al actualizar',
    }, { status: 500 })
  }
}