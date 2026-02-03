import { NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export async function POST() {
  const response = NextResponse.json<ApiResponse>({
    success: true,
    message: 'Logout exitoso',
  })

  // Eliminar cookie de sesión
  response.cookies.delete('admin-session')

  return response
}