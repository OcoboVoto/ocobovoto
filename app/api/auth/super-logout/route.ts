import { NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export async function POST() {
  const response = NextResponse.json<ApiResponse>({
    success: true,
    message: 'Logout exitoso',
  })

  // Eliminar cookie de sesión de super admin
  response.cookies.delete('super-admin-session')

  return response
}