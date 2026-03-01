// app/api/propietarios/buscar/route.ts
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

    // 1. Buscar el conjunto de la asamblea (si se proporciona)
    let conjuntoId: string | undefined
    if (asambleaId) {
      const asamblea = await prisma.asamblea.findUnique({
        where: { id: asambleaId },
        select: { conjuntoId: true }
      })

      if (!asamblea) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Asamblea no encontrada',
        }, { status: 404 })
      }

      conjuntoId = asamblea.conjuntoId
    }

    // 2. Buscar TODOS los propietarios con esa cédula en el conjunto
    const propietarios = await prisma.propietario.findMany({
      where: {
        cedula,
        ...(conjuntoId && { conjuntoId }),
        activo: true,
      },
      select: {
        id: true,
        nombreCompleto: true,
        cedula: true,
        torreManzana: true,
        aptoCasa: true,
        coeficiente: true,
      },
    })

    // ─────────────────────────────────────────────────────────────────────────
    // CASO: No es propietario del conjunto → verificar si es apoderado externo
    // ─────────────────────────────────────────────────────────────────────────
    if (propietarios.length === 0) {
      if (!asambleaId) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Propietario no encontrado con esa cédula',
        }, { status: 404 })
      }

      // Buscar poderes donde esta cédula es el apoderado
      const poderesExternos = await prisma.poder.findMany({
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

      // No es propietario y tampoco tiene poderes
      if (poderesExternos.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Cédula no encontrada. No es propietario del conjunto ni tiene poderes registrados para esta asamblea.',
        }, { status: 404 })
      }

      // Verificar que los otorgantes no estén ya registrados como votantes
      const otorgantesRegistrados = await prisma.votante.findMany({
        where: {
          asambleaId,
          cedula: {
            in: poderesExternos.map(p => p.propietarioOtorgante.cedula),
          },
        },
        select: { cedula: true, nombreCompleto: true },
      })

      if (otorgantesRegistrados.length > 0) {
        const nombres = otorgantesRegistrados.map(r => r.nombreCompleto).join(', ')
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Los siguientes otorgantes ya están registrados directamente: ${nombres}. No puedes usar sus poderes.`,
        }, { status: 400 })
      }

      // Calcular coeficiente total de los poderes
      const coeficienteTotal = poderesExternos.reduce(
        (sum, p) => sum + Number(p.propietarioOtorgante.coeficiente),
        0
      )

      // El nombre del apoderado externo viene del primer poder registrado
      const nombreApoderado = poderesExternos[0].nombreApoderado

      console.log(
        `Apoderado externo ${nombreApoderado} (${cedula}): ${poderesExternos.length} poder(es), coef. total: ${coeficienteTotal.toFixed(4)}%`
      )

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          id: null,                    // No tiene ID de propietario
          nombreCompleto: nombreApoderado,
          cedula,
          torreManzana: 'Externo',
          aptoCasa: 'N/A',
          coeficiente: 0,              // Sin coeficiente propio
          esPropietario: false,        // ← Flag clave para la UI
          poderesOtorgados: poderesExternos.map(p => ({
            id: p.id,
            otorgante: p.propietarioOtorgante,
          })),
          coeficienteTotal,
          tienePoderes: true,
          cantidadUnidades: 0,
          unidades: [],
        },
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASO: Es propietario del conjunto (flujo original sin cambios)
    // ─────────────────────────────────────────────────────────────────────────

    // 3. Sumar coeficientes de TODAS las propiedades del propietario
    const coeficientePropio = propietarios.reduce(
      (sum, prop) => sum + Number(prop.coeficiente),
      0
    )

    // 4. Crear lista de unidades
    const unidadesPropias = propietarios.map(p => `${p.torreManzana}-${p.aptoCasa}`)
    const unidadesTexto = propietarios.length > 1
      ? unidadesPropias.join(', ')
      : `${propietarios[0].torreManzana}-${propietarios[0].aptoCasa}`

    // 5. Si se proporciona asambleaId, buscar poderes otorgados A esta persona
    let poderesOtorgados: any[] = []
    let coeficienteTotal = coeficientePropio

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
        coeficientePropio
      )
    }

    console.log(
      `Propietario ${propietarios[0].nombreCompleto}: ${propietarios.length} unidad(es), coef. propio: ${coeficientePropio.toFixed(4)}%, total: ${coeficienteTotal.toFixed(4)}%`
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: propietarios[0].id,
        nombreCompleto: propietarios[0].nombreCompleto,
        cedula: propietarios[0].cedula,
        torreManzana: propietarios.length > 1 ? 'Múltiples' : propietarios[0].torreManzana,
        aptoCasa: unidadesTexto,
        coeficiente: coeficientePropio,
        esPropietario: true,          
        poderesOtorgados: poderesOtorgados.map(p => ({
          id: p.id,
          otorgante: p.propietarioOtorgante,
        })),
        coeficienteTotal,
        tienePoderes: poderesOtorgados.length > 0,
        cantidadUnidades: propietarios.length,
        unidades: unidadesPropias,
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