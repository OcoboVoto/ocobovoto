import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { ApiResponse } from '@/types'

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

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    const { conjuntoId, email, password, nombre } = body

    // Validaciones
    if (!conjuntoId || !email || !password || !nombre) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Todos los campos son requeridos',
      }, { status: 400 })
    }

    // Verificar que el conjunto existe
    const conjunto = await prisma.conjunto.findUnique({
      where: { id: conjuntoId },
      include: { admin: true },
    })

    if (!conjunto) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Conjunto no encontrado',
      }, { status: 404 })
    }

    if (conjunto.admin) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Este conjunto ya tiene un administrador',
      }, { status: 400 })
    }

    // Verificar que el email no esté usado
    const emailExiste = await prisma.usuarioAdmin.findUnique({
      where: { email },
    })

    if (emailExiste) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Este email ya está registrado',
      }, { status: 400 })
    }

    // Crear admin
    const passwordHash = await bcrypt.hash(password, 10)
    
    const admin = await prisma.usuarioAdmin.create({
      data: {
        conjuntoId,
        email,
        passwordHash,
        nombre,
        activo: true,
        createdBy: session.id,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre,
        conjuntoId: admin.conjuntoId,
      },
      message: 'Administrador creado exitosamente',
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/super/admins:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error al crear administrador',
    }, { status: 500 })
  }
}