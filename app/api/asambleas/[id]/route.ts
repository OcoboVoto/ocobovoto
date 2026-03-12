// app/api/asambleas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { serializeAsamblea } from '@/lib/utils/serialize-decimal'
import { publishToChannel } from '@/lib/ably/server'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'

// GET: Obtener asamblea por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        conjunto: {
          select: { id: true, nombre: true, coeficienteTotal: true },
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
          },
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

    const propietariosConjunto = await prisma.propietario.findMany({
      where: { conjuntoId: asamblea.conjuntoId, activo: true },
      select: { cedula: true },
      orderBy: [{ torreManzana: 'asc' }, { aptoCasa: 'asc' }],
    })

    const cedulasPropietariosSet = new Set(propietariosConjunto.map(p => p.cedula))

    // Total personas físicas que se registraron
    const totalAsistentes = asamblea.votantes.length

    // Propietarios del conjunto que vinieron en persona
    const asistentesDirectos = asamblea.votantes.filter(
      v => cedulasPropietariosSet.has(v.cedula)
    ).length

    // Apoderados externos (no son propietarios del conjunto)
    const asistentesPorPoder = asamblea.votantes.filter(
      v => !cedulasPropietariosSet.has(v.cedula)
    ).length

    // ── Unidades representadas (para quórum legal) 
    // Suma de propietariosRepresenta de todos los votantes
    // Incluye: unidades propias de propietarios + poderes representados por apoderados
    const totalUnidades = asamblea.votantes.reduce(
      (sum, v) => sum + v.propietariosRepresenta, 0
    )

    const serialized = serializeAsamblea({
      ...asamblea,
      _count: {
        ...asamblea._count,
        registros: asamblea._count.registros,
        votantes: asamblea._count.votantes,
        asistentesDirectos,
        asistentesPorPoder,
        totalAsistentes,
        totalUnidades
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: serialized,
    })
  } catch (error) {
    console.error('Error en GET /api/asambleas/[id]:', error)
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
      data: { estado },
    })

    await publishToChannel(
      ABLY_CHANNELS.asamblea(id),
      ABLY_EVENTS.ASAMBLEA_UPDATE,
      {
        tipo: 'estado-cambio',
        estado,
        timeStamp: new Date().toISOString(),
      }
    )

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