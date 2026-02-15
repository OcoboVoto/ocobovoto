import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { serializeAsamblea } from '@/lib/utils/serialize-decimal'

// GET: Listar asambleas del conjunto
export async function GET(request: NextRequest) {
  try {
    const conjuntoId = request.nextUrl.searchParams.get('conjuntoId')

    if (!conjuntoId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'conjuntoId requerido',
      }, { status: 400 })
    }

    const asambleas = await prisma.asamblea.findMany({
      where: { conjuntoId },
      orderBy: { fechaHora: 'desc' },
      include: {
        _count: {
          select: {
            votantes: true,
            proposiciones: true,
            confirmaciones: true,
          },
        },
      },
    })

    const serialized = asambleas.map(serializeAsamblea)
    return NextResponse.json<ApiResponse>({
      success: true,
      data: serialized,
    })
  } catch (error) {
    console.error('Error en GET /api/asambleas:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno',
    }, { status: 500 })
  }
}

// POST: Crear asamblea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conjuntoId, tipo, fechaHora, modalidad, quorumRequerido, linkZoom } = body

    // Generar código QR único
    const qrCodeData = `ASM-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const asamblea = await prisma.asamblea.create({
      data: {
        conjuntoId,
        tipo,
        fechaHora: new Date(fechaHora),
        modalidad,
        quorumRequerido,
        qrCodeData,
        estado: 'borrador',
        linkZoom: linkZoom ?? null,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: asamblea,
      message: 'Asamblea creada exitosamente',
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/asambleas:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al crear asamblea',
    }, { status: 500 })
  }
}