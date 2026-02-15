import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email y contraseña son requeridos',
      }, { status: 400 })
    }

    // Validar credenciales
    const result = await AuthService.login({ email, password })

    if (!result.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error,
      }, { status: 401 })
    }

    // Crear sesión en Supabase
    const supabase = await createClient()
    
    // Usar signInAnonymously o crear un usuario temporal
    // Por ahora usaremos una sesión simple con cookies
    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: result.admin,
      message: 'Login exitoso',
    })

    // Establecer cookie con datos del admin
    response.cookies.set('admin-session', JSON.stringify(result.admin), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Error en POST /api/auth/login:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })
  }
}