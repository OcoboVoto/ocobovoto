//app/api/propietarios/buscar
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const cedula = request.nextUrl.searchParams.get('cedula')
    const asambleaId = request.nextUrl.searchParams.get('asambleaId')

    if (!cedula) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cédula requerida',
      }, { status: 400 })
    }

    const propietario = await prisma.propietario.findUnique({
      where: { cedula },
      select: {
        id: true,
        nombreCompleto: true,
        cedula: true,
        torreManzana: true,
        aptoCasa: true,
        coeficiente: true,
      },
    })

    if (!propietario) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Propietario no encontrado',
      }, { status: 404 })
    }

    // Si se proporciona asambleaId, buscar poderes otorgados A esta persona
    let poderesOtorgados: any[] = []
    let coeficienteTotal = Number(propietario.coeficiente)

    if (asambleaId) {
      // Buscar poderes donde ESTA PERSONA es el APODERADO
      poderesOtorgados = await prisma.poder.findMany({
        where: {
          cedulaApoderado: cedula,
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
      })

      // Verificar que los otorgantes no estén ya registrados
      if (poderesOtorgados.length > 0) {
        const otorgantesIds = poderesOtorgados.map(p => p.propietarioOtorgante.id)
        const otorgantesRegistrados = await prisma.votante.findMany({
          where: {
            asambleaId,
            cedula: {
              in: poderesOtorgados.map(p => p.propietarioOtorgante.cedula),
            },
          },
          select: {
            cedula: true,
            nombreCompleto: true,
          },
        })

        if (otorgantesRegistrados.length > 0) {
          const nombres = otorgantesRegistrados.map(r => r.nombreCompleto).join(', ')
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Los siguientes otorgantes ya están registrados: ${nombres}. No puedes usar estos poderes.`,
          }, { status: 400 })
        }
      }

      // Calcular coeficiente total (propio + poderes)
      coeficienteTotal = poderesOtorgados.reduce(
        (sum, poder) => sum + Number(poder.propietarioOtorgante.coeficiente),
        Number(propietario.coeficiente)
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data:{
        ...propietario,
        poderesOtorgados: poderesOtorgados.map(p => ({
          id: p.id,
          otorgante: p.propietarioOtorgante,
        })),
        coeficienteTotal,
        tienePoderes: poderesOtorgados.length > 0,
      },
    })

  } catch (error) {
    console.error('Error en GET /api/propietarios/buscar:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno',
    }, { status: 500 })
  }
}