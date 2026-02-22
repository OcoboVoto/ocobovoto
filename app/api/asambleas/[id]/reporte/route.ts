//app/api/asambleas/[id]/reporte//route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { getAsambleaReporteData } from '@/lib/reportes/get-asamblea-reporte'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const reporte = await getAsambleaReporteData(id)

    if (!reporte) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: reporte,
    })
  } catch (error) {
    console.error('Error en GET /api/asambleas/[id]/reporte:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al generar reporte',
    }, { status: 500 })
  }
}