//app/api/poderes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedulaOtorgante, cedulaApoderado, nombreApoderado } = body

    // Buscar propietario otorgante
    const otorgante = await prisma.propietario.findFirst({
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
        const apoderado = await prisma.propietario.findFirst({
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
