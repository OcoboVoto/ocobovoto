//app/api/votos/route.tsx
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposicionId, votanteId, opcionId } = body

    // Verificar que la proposición está activa
    const proposicion = await prisma.proposicion.findUnique({
      where: { id: proposicionId },
    })

    if (!proposicion || proposicion.estado !== 'activa') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'La votación no está activa',
      }, { status: 400 })
    }

    // Verificar que el votante existe
    const votante = await prisma.votante.findUnique({
      where: { id: votanteId },
    })

    if (!votante) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Votante no encontrado',
      }, { status: 404 })
    }

    // Verificar si ya votó
    const votoExistente = await prisma.voto.findUnique({
      where: {
        proposicionId_votanteId: {
          proposicionId,
          votanteId,
        },
      },
    })

    if (votoExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Ya has votado en esta pregunta',
      }, { status: 400 })
    }

    // Registrar voto
    const voto = await prisma.voto.create({
      data: {
        proposicionId,
        votanteId,
        opcionId,
        coeficienteAplicado: votante.coeficienteTotal,
        propietariosRepresentados: votante.propietariosRepresenta,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: voto,
      message: 'Voto registrado exitosamente',
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/votos:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al registrar voto',
    }, { status: 500 })
  }
}