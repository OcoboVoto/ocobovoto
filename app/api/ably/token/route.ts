// app/api/ably/token/route.ts
// Endpoint seguro para generar tokens de Ably para los clientes.

import { NextRequest, NextResponse } from 'next/server'
import Ably from 'ably'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ABLY_API_KEY

    if (!apiKey) {
      console.error('[Ably Token] ABLY_API_KEY no configurada')
      return NextResponse.json(
        { error: 'Configuración de Ably faltante' },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId') || `anon-${Date.now()}`

    const ably = new Ably.Rest({ key: apiKey })

    // Generar token con permisos y TTL controlados
    // Tiempo de vida del token: 1 hora
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      ttl: 3600 * 1000,
      capability: {
        'asamblea:*': ['subscribe'],
        'resultados:*': ['subscribe'],
      },
    })

    return NextResponse.json(tokenRequest, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('[Ably Token] Error generando token:', error)
    return NextResponse.json(
      { error: 'Error al generar token de Ably' },
      { status: 500 }
    )
  }
}
