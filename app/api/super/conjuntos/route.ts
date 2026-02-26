import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Verificar que es super admin
    const sessionCookie = request.cookies.get('super-admin-session')
    
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No autenticado como super admin',
      }, { status: 401 })
    }

    const conjuntos = await prisma.conjunto.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            nombre: true,
            activo: true,
          },
        },
        _count: {
          select: {
            asambleas: true,
            propietarios: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: conjuntos,
    })

  } catch (error) {
    console.error('Error en GET /api/super/conjuntos:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al obtener conjuntos',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que es super admin
    const sessionCookie = request.cookies.get('super-admin-session')
    
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No autenticado como super admin',
      }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, nit, coeficienteTotal, adminId  } = body

    const conjunto = await prisma.conjunto.create({
      data: {
        nombre,
        nit,
        coeficienteTotal,
        ...(adminId ? { adminId } : {}),
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: conjunto,
      message: 'Conjunto creado exitosamente',
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/super/conjuntos:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al crear conjunto',
    }, { status: 500 })
  }
}