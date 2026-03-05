import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { ApiResponse } from '@/types'

// GET: Listar todos los administradores (para el selector del formulario)
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('super-admin-session')
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const admins = await prisma.usuarioAdmin.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        createdAt: true,
        conjunto: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json<ApiResponse>({ success: true, data: admins })
  } catch (error) {
    console.error('Error en GET /api/super/admins:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error al obtener admins' }, { status: 500 })
  }
}

// POST: Crear nuevo administrador y opcionalmente asignarlo a un conjunto
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('super-admin-session')
    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado como super admin' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    const { conjuntoId, email, password, nombre } = body

    if (!email || !password || !nombre) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
    }

    // Verificar que el email no esté usado
    const emailExiste = await prisma.usuarioAdmin.findUnique({ where: { email } })
    if (emailExiste) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Este email ya está registrado' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // 1. Crear el admin sin tocar conjuntos
    const admin = await prisma.usuarioAdmin.create({
      data: {
        email,
        passwordHash,
        nombre,
        activo: true,
        createdBy: session.id,
      },
    })

    // 2. Si viene conjuntoId, actualizar el conjunto apuntando al nuevo admin
    if (conjuntoId) {
      await prisma.conjunto.update({
        where: { id: conjuntoId },
        data: { adminId: admin.id },
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: admin.id, email: admin.email, nombre: admin.nombre },
      message: 'Administrador creado exitosamente',
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/super/admins:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error al crear administrador' }, { status: 500 })
  }
}