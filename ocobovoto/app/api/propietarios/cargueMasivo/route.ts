// app/api/propietarios/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropietariosValidator } from '@/lib/services/propietarios-validator'
import { ApiResponse, PropietarioCSV } from '@/types'

/**
 * POST /api/propietarios/cargueMasivo
 * Guarda múltiples propietarios desde CSV
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conjuntoId, propietarios } = body

    // Validaciones básicas
    if (!conjuntoId || !propietarios || !Array.isArray(propietarios)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Datos inválidos. Se requiere conjuntoId y array de propietarios',
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

    // Guardar en base de datos usando transacción
    const propietariosCreados = await prisma.$transaction(async (tx) => {
      // Primero, marcar como inactivos los propietarios existentes del conjunto
      await tx.propietario.updateMany({
        where: { conjuntoId },
        data: { activo: false },
      })

      // Crear los nuevos propietarios
      const creados = await Promise.all(
        resultado.validos.map((prop) =>
          tx.propietario.upsert({
            where: {
              conjuntoId_torreManzana_aptoCasa: {
                conjuntoId,
                torreManzana: prop.torre_manzana,
                aptoCasa: prop.apto_casa,
              },
            },
            update: {
              nombreCompleto: prop.nombre,
              cedula: `${conjuntoId}-${prop.torre_manzana}-${prop.apto_casa}`, // Temporal si no hay cédula
              celular: prop.celular,
              email: prop.email,
              coeficiente: prop.coeficiente,
              activo: true,
            },
            create: {
              conjuntoId,
              torreManzana: prop.torre_manzana,
              aptoCasa: prop.apto_casa,
              nombreCompleto: prop.nombre,
              cedula: `${conjuntoId}-${prop.torre_manzana}-${prop.apto_casa}`, // Temporal
              celular: prop.celular,
              email: prop.email,
              coeficiente: prop.coeficiente,
              activo: true,
            },
          })
        )
      )

      // Actualizar coeficiente total del conjunto
      const coeficienteTotal = PropietariosValidator.calcularCoeficienteTotal(resultado.validos)
      await tx.conjunto.update({
        where: { id: conjuntoId },
        data: { coeficienteTotal },
      })

      return creados
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${propietariosCreados.length} propietarios guardados exitosamente`,
      data: {
        count: propietariosCreados.length,
        propietarios: propietariosCreados,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/propietarios/cargueMasivo:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}

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