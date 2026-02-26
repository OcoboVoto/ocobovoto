import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, conjuntoId } = body

    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email y contraseña son requeridos',
      }, { status: 400 })
    }

    const result = await AuthService.login({ email, password, conjuntoId })

    // necesita elegir conjunto → devolver lista sin crear sesión
    if (result.requiresConjuntoSelection) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: {
          requiresConjuntoSelection: true,
          conjuntos: result.conjuntos,
        },
        error: 'Selecciona el conjunto a administrar',
      })
    }

    if (!result.success || !result.admin) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error,
      }, { status: 401 })
    }

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
      maxAge: 60 * 60 * 24 * 7,
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