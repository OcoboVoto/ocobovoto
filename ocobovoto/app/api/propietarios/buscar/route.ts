import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const cedula = request.nextUrl.searchParams.get('cedula')

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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: propietario,
    })

  } catch (error) {
    console.error('Error en GET /api/propietarios/buscar:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno',
    }, { status: 500 })
  }
}