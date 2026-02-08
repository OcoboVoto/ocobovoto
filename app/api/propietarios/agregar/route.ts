import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropietariosValidator } from '@/lib/services/propietarios-validator'
import { ApiResponse } from '@/types'

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

    // Crear/Actualizar propietarios SIN marcar otros como inactivos
    const propietariosCreados = await Promise.all(
      resultado.validos.map((prop) =>
        prisma.propietario.upsert({
          where: {
            cedula: prop.cedula,
          },
          update: {
            conjuntoId,
            nombreCompleto: prop.nombre,
            torreManzana: prop.torre_manzana,
            aptoCasa: prop.apto_casa,
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
            cedula: prop.cedula,
            celular: prop.celular,
            email: prop.email,
            coeficiente: prop.coeficiente,
            activo: true,
          },
        })
      )
    )
    console.log('propietarios creados:_____', propietariosCreados)
  
    
    //Crear poderes si viene asambleaId y hay datos de apoderado
    /*if (asambleaId) {
      const poderesCreados = []

      for (const prop of resultado.validos) {
        if (prop.cedula_apoderado && prop.nombre_apoderado) {
          // Buscar el propietario otorgante
          const otorgante = await prisma.propietario.findUnique({
            where: { cedula: prop.cedula },
          })

          if (otorgante) {
            try {
              // Crear poder
              const poder = await prisma.poder.create({
                data: {
                  propietarioOtorganteId: otorgante.id,
                  asambleaId,
                  cedulaApoderado: prop.cedula_apoderado,
                  nombreApoderado: prop.nombre_apoderado,
                  activo: true,
                },
              })
              poderesCreados.push(poder)
            } catch (error) {
              console.error(`Error creando poder para ${prop.nombre}:`, error)
            }
          }
        }
      }
      console.log(`✅ ${poderesCreados.length} poderes creados`)
    }
*/
   /* // Recalcular coeficiente total
    const todosPropietarios = await prisma.propietario.findMany({
      where: {
        conjuntoId,
        activo: true,
      },
    })

    const coeficienteTotal = todosPropietarios.reduce(
      (sum, p) => sum + Number(p.coeficiente),
      0
    )

    await prisma.conjunto.update({
      where: { id: conjuntoId },
      data: { coeficienteTotal },
    })*/

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${propietariosCreados.length} propietarios agregados/actualizados exitosamente`,
      data: {
        count: propietariosCreados.length,
        propietarios: propietariosCreados,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/propietarios/agregar:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}