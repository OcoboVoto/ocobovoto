import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email y contraseña son requeridos',
      }, { status: 400 })
    }

    // Buscar super admin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email },
    })

    if (!superAdmin) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Credenciales inválidas',
      }, { status: 401 })
    }

    // Verificar password
    const passwordValido = await bcrypt.compare(password, superAdmin.passwordHash)

    if (!passwordValido) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Credenciales inválidas',
      }, { status: 401 })
    }

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        nombre: superAdmin.nombre,
        role: 'super_admin',
      },
      message: 'Login exitoso',
    })

    // Establecer cookie diferente para super admin
    response.cookies.set('super-admin-session', JSON.stringify({
      id: superAdmin.id,
      email: superAdmin.email,
      nombre: superAdmin.nombre,
      role: 'super_admin',
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Error en POST /api/auth/super-login:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}