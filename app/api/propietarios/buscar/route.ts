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

    // 2. Buscar TODOS los propietarios con esa cédula
    const propietarios = await prisma.propietario.findMany({
      where: { 
        cedula,
        ...(conjuntoId && { conjuntoId }), // Filtrar por conjunto si existe
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

    if (propietarios.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Propietario no encontrado',
      }, { status: 404 })
    }

    // 3. Sumar coeficientes de TODAS las propiedades
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

    console.log(`Propietario ${propietarios[0].nombreCompleto}: ${propietarios.length} unidad(es), coef. propio: ${coeficientePropio.toFixed(4)}%, total: ${coeficienteTotal.toFixed(4)}%`)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: propietarios[0].id,
        nombreCompleto: propietarios[0].nombreCompleto,
        cedula: propietarios[0].cedula,
        torreManzana: propietarios.length > 1 ? 'Múltiples' : propietarios[0].torreManzana,
        aptoCasa: unidadesTexto,
        coeficiente: coeficientePropio, // Suma de todas sus propiedades
        poderesOtorgados: poderesOtorgados.map(p => ({
          id: p.id,
          otorgante: p.propietarioOtorgante,
        })),
        coeficienteTotal,
        tienePoderes: poderesOtorgados.length > 0,
        cantidadUnidades: propietarios.length, // Nuevo campo
        unidades: unidadesPropias, // Nuevo campo: array de unidades
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