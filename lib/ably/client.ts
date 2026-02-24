// lib/ably/client.ts
// Cliente Ably para uso en el browser (componentes React)
// Usa Token Auth para no exponer la API Key al cliente

import Ably from 'ably'

let ablyClientInstance: Ably.Realtime | null = null

/**
 * Obtiene el cliente Ably singleton para el browser.
 * Usa Token Auth: el cliente pide un token temporal al endpoint /api/ably/token
 */
export function getAblyClient(): Ably.Realtime {
  // Solo ejecutar en el browser
  if (typeof window === 'undefined') {
    throw new Error('getAblyClient() solo puede usarse en el browser')
  }

  if (!ablyClientInstance || ablyClientInstance.connection.state === 'closed') {
    ablyClientInstance = new Ably.Realtime({
      // Token Auth: el cliente llama a nuestro endpoint para obtener un token seguro
      authUrl: '/api/ably/token',
      authMethod: 'GET',

      // Configuración para alta disponibilidad
      // Reconexión automática con backoff exponencial
      disconnectedRetryTimeout: 5000,   // Reintentar cada 5s si se desconecta
      suspendedRetryTimeout: 15000,     // Reintentar cada 15s si está suspendido

      // Mantener la conexión viva
      closeOnUnload: false,

      // Log level: 1=error, 2=warn, 3=info, 4=debug (usar 1 en producción)
      logLevel: process.env.NODE_ENV === 'development' ? 2 : 1,
    })

    // Logging de estado de conexión en desarrollo
    if (process.env.NODE_ENV === 'development') {
      ablyClientInstance.connection.on((stateChange) => {
        console.log('[Ably] Conexión:', stateChange.current, stateChange.reason?.message || '')
      })
    }
  }

  return ablyClientInstance
}

/**
 * Cierra el cliente Ably y limpia el singleton.
 * Útil para cleanup en desarrollo o logout.
 */
export function closeAblyClient(): void {
  if (ablyClientInstance) {
    ablyClientInstance.close()
    ablyClientInstance = null
  }
}
