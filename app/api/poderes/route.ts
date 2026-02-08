//app/api/poderes
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedulaOtorgante, cedulaApoderado, nombreApoderado } = body

    // Buscar propietario otorgante
    const otorgante = await prisma.propietario.findUnique({
      where: { cedula: cedulaOtorgante },
    })

    if (!otorgante) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Propietario otorgante no encontrado',
      }, { status: 404 })
    }

    // Verificar que no tenga poder ya otorgado
    const poderExistente = await prisma.poder.findUnique({
      where: {
        propietarioOtorganteId_asambleaId: {
          propietarioOtorganteId: otorgante.id,
          asambleaId,
        },
      },
    })

    if (poderExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Este propietario ya otorgó un poder para esta asamblea',
      }, { status: 400 })
    }

    // Verificar que el otorgante no esté ya registrado
    const yaRegistrado = await prisma.votante.findFirst({
      where: {
        asambleaId,
        cedula: cedulaOtorgante,
      },
    })

    if (yaRegistrado) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El otorgante ya está registrado en la asamblea y no puede otorgar poder',
      }, { status: 400 })
    }

    // Crear poder
    const poder = await prisma.poder.create({
      data: {
        propietarioOtorganteId: otorgante.id,
        asambleaId,
        cedulaApoderado,
        nombreApoderado,
      },
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
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: poder,
      message: 'Poder otorgado exitosamente',
    })

  } catch (error) {
    console.error('Error en POST /api/poderes:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al crear poder',
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const asambleaId = request.nextUrl.searchParams.get('asambleaId')

    if (!asambleaId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'asambleaId requerido',
      }, { status: 400 })
    }

    const poderes = await prisma.poder.findMany({
      where: {
        asambleaId,
        activo: true,
      },
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
      orderBy: {
        fechaRegistro: 'desc',
      },
    })

    // Opcionalmente, buscar información del apoderado si existe en la BD
    const poderesConApoderado = await Promise.all(
      poderes.map(async (poder) => {
        const apoderado = await prisma.propietario.findUnique({
          where: { cedula: poder.cedulaApoderado },
          select: {
            id: true,
            nombreCompleto: true,
            cedula: true,
          },
        })
        return {
          ...poder,
          apoderado, // Puede ser null si el apoderado no está en la BD
          otorgante: poder.propietarioOtorgante, // Alias más claro
        }
      })
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: poderesConApoderado,
    })

  } catch (error) {
    console.error('Error en GET /api/poderes:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al obtener poderes',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const poderId = request.nextUrl.searchParams.get('id')

    if (!poderId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'ID de poder requerido',
      }, { status: 400 })
    }

    // Verificar que el poder existe
    const poder = await prisma.poder.findUnique({
      where: { id: poderId },
      include: {
        propietarioOtorgante: true,
      },
    })

    if (!poder) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Poder no encontrado',
      }, { status: 404 })
    }

    // Verificar que el apoderado no esté ya registrado con este poder
    const apoderadoRegistrado = await prisma.votante.findFirst({
      where: {
        asambleaId: poder.asambleaId,
        cedula: poder.cedulaApoderado,
      },
    })

    if (apoderadoRegistrado) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No se puede eliminar el poder porque el apoderado ya está registrado',
      }, { status: 400 })
    }

    // Desactivar el poder (soft delete)
    await prisma.poder.update({
      where: { id: poderId },
      data: { activo: false },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Poder eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/poderes:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al eliminar poder',
    }, { status: 500 })
  }
}