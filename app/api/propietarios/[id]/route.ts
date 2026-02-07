import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      nombreCompleto,
      cedula,
      torreManzana,
      aptoCasa,
      celular,
      email,
      coeficiente,
    } = body

    const propietario = await prisma.propietario.update({
      where: { id },
      data: {
        nombreCompleto,
        cedula,
        torreManzana,
        aptoCasa,
        celular,
        email,
        coeficiente: parseFloat(coeficiente),
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: propietario,
      message: 'Propietario actualizado',
    })

  } catch (error) {
    console.error('Error en PATCH /api/propietarios/[id]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al actualizar propietario',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.propietario.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Propietario eliminado',
    })

  } catch (error) {
    console.error('Error en DELETE /api/propietarios/[id]:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al eliminar propietario',
    }, { status: 500 })
  }
}