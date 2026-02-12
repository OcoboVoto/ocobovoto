import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropietariosValidator } from '@/lib/services/propietarios-validator'
import { ApiResponse } from '@/types'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conjuntoId, propietarios } = body

    if (!conjuntoId || !propietarios || !Array.isArray(propietarios)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Datos inválidos',
      }, { status: 400 })
    }

    // Verificar que el conjunto existe
    const conjunto = await prisma.conjunto.findUnique({
      where: { id: conjuntoId },
    })

    if (!conjunto) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Conjunto no encontrado',
      }, { status: 404 })
    }

    // Validar propietarios
    const resultado = PropietariosValidator.validar(propietarios)

    if (resultado.invalidos.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Hay propietarios con errores',
        data: {
          invalidos: resultado.invalidos,
          duplicados: resultado.duplicados,
        },
      }, { status: 400 })
    }

    const propietariosCreados = []
    const erroresDuplicados: string[] = []

    for (const prop of resultado.validos) {
      try {
        const propietario = await prisma.propietario.upsert({
          where: {
            cedula: prop.cedula,
          },
          update: {
            conjuntoId,
            nombreCompleto: prop.nombre,
            torreManzana: prop.torre_manzana,
            aptoCasa: prop.apto_casa,
            coeficiente: prop.coeficiente,
            activo: true,
          },
          create: {
            conjuntoId,
            torreManzana: prop.torre_manzana,
            aptoCasa: prop.apto_casa,
            nombreCompleto: prop.nombre,
            cedula: prop.cedula,
            coeficiente: prop.coeficiente,
            activo: true,
          },
        })

        propietariosCreados.push(propietario)

      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          erroresDuplicados.push(
            `La unidad Torre "${prop.torre_manzana}" Apto "${prop.apto_casa}" ya existe en el sistema`
          )
        } else {
          console.error('Error inesperado:', error)
          erroresDuplicados.push(
            `Error inesperado al guardar ${prop.nombre}`
          )
        }
      }
    }

    if (erroresDuplicados.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Algunos propietarios no pudieron guardarse',
        data: {
          errores: erroresDuplicados,
          guardados: propietariosCreados.length,
        },
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${propietariosCreados.length} propietarios guardados exitosamente`,
      data: {
        count: propietariosCreados.length,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Error general:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}
