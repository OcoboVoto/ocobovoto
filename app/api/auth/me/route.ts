import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('admin-session')

  if (!sessionCookie) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'No autenticado',
    }, { status: 401 })
  }

  try {
    const admin = JSON.parse(sessionCookie.value)
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: admin,
    })
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Sesión inválida',
    }, { status: 401 })
  }
}