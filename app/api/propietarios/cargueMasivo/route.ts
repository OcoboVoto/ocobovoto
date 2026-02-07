import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

/**
 * GET /api/propietarios/cargueMasivo?conjuntoId=xxx
 * Obtiene todos los propietarios de un conjunto
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conjuntoId = searchParams.get('conjuntoId')

    if (!conjuntoId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Se requiere conjuntoId',
      }, { status: 400 })
    }

    const propietarios = await prisma.propietario.findMany({
      where: {
        conjuntoId,
        activo: true,
      },
      orderBy: [
        { torreManzana: 'asc' },
        { aptoCasa: 'asc' },
      ],
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: propietarios,
    })

  } catch (error) {
    console.error('Error en GET /api/propietarios/bulk:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}