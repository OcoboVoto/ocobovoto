//app/api/poderes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// ============================================================
// SOLUCIÓN ACTIVA: Poderes 1x1 (commit 217e8bb)
// Un poder por propietario (toma solo el primer registro con esa cédula)
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedulaOtorgante, cedulaApoderado, nombreApoderado, propietarioIds } = body

    // ─────────────────────────────────────────────────────────────────────
    // RAMA A: IDs específicos (constructora con múltiples unidades)
    // El front envía exactamente cuáles filas de Propietario se van a delegar
    // ─────────────────────────────────────────────────────────────────────
    if (Array.isArray(propietarioIds) && propietarioIds.length > 0) {
      // 1. Buscar los propietarios por IDs
      const otorgantes = await prisma.propietario.findMany({
        where: { id: { in: propietarioIds } },
      })

      if (otorgantes.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'No se encontraron las unidades indicadas',
        }, { status: 404 })
      }

      // 2. Verificar que ninguna de esas unidades ya tenga poder
      const poderesExistentes = await prisma.poder.findMany({
        where: {
          propietarioOtorganteId: { in: propietarioIds },
          asambleaId,
        },
        include: {
          propietarioOtorgante: { select: { torreManzana: true, aptoCasa: true } },
        },
      })

      if (poderesExistentes.length > 0) {
        const unidades = poderesExistentes
          .map(p => `${p.propietarioOtorgante.torreManzana}-${p.propietarioOtorgante.aptoCasa}`)
          .join(', ')
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Las siguientes unidades ya tienen poder asignado: ${unidades}`,
        }, { status: 400 })
      }

      // 3. Verificar que el otorgante no esté ya registrado como votante
      const yaRegistrado = await prisma.votante.findFirst({
        where: { asambleaId, cedula: otorgantes[0].cedula },
      })

      if (yaRegistrado) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'El otorgante ya está registrado en la asamblea y no puede otorgar poder',
        }, { status: 400 })
      }

      // 4. Crear un poder por cada unidad seleccionada en una sola transacción
      const poderes = await prisma.$transaction(
        otorgantes.map(otorgante =>
          prisma.poder.create({
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
        )
      )

      const mensaje =
        otorgantes.length > 1
          ? `${otorgantes.length} poderes otorgados exitosamente a ${nombreApoderado}`
          : `Poder otorgado exitosamente a ${nombreApoderado}`

      return NextResponse.json<ApiResponse>({
        success: true,
        data: poderes,
        message: mensaje,
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // RAMA B: Poder 1x1 por cédula (flujo original — commit 217e8bb)
    // Toma el primer registro que coincida con la cédula
    // ─────────────────────────────────────────────────────────────────────

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

// ============================================================
// SOLUCIÓN ALTERNATIVA: Poderes múltiples (commit e6d5646)
// Crea un poder por CADA propiedad asociada a la cédula del otorgante
// Útil cuando un propietario tiene múltiples unidades (aptos/casas)
// ============================================================

/*
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asambleaId, cedulaOtorgante, cedulaApoderado, nombreApoderado } = body

    // Buscar propietario otorgante
    const otorgantes = await prisma.propietario.findMany({
      where: { cedula: cedulaOtorgante },
    })

    if (otorgantes.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Propietario otorgante no encontrado',
      }, { status: 404 })
    }

    // Verificar que ninguna de sus propiedades ya tenga poder otorgado
    const poderesExistentes = await prisma.poder.findMany({
      where: {
        propietarioOtorganteId: { in: otorgantes.map(o => o.id) },
        asambleaId,
      },
      include: {
        propietarioOtorgante: {
          select: { torreManzana: true, aptoCasa: true }
        }
      }
    })

    if (poderesExistentes.length > 0) {
      const unidades = poderesExistentes
        .map(p => `${p.propietarioOtorgante.torreManzana}-${p.propietarioOtorgante.aptoCasa}`)
        .join(', ')
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Este propietario ya otorgó poderes en esta asamblea para: ${unidades}`,
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

    //Crear un poder por CADA propiedad del otorgante en una transacción
    const poderes = await prisma.$transaction(
      otorgantes.map(otorgante =>
        prisma.poder.create({
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
      )
    )

    const mensaje = otorgantes.length > 1
      ? `${otorgantes.length} poderes otorgados exitosamente a ${nombreApoderado} (${otorgantes.length} unidades)`
      : `Poder otorgado exitosamente a ${nombreApoderado}`

    return NextResponse.json<ApiResponse>({
      success: true,
      data: poderes,
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
*/

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
