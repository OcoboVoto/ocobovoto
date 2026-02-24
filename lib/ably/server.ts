// lib/ably/server.ts
// Cliente Ably para uso en API routes (server-side)

import Ably from 'ably'

// Singleton para reutilizar la conexión entre requests en el mismo worker
let ablyServerInstance: Ably.Rest | null = null

export function getAblyServer(): Ably.Rest {
  if (!ablyServerInstance) {
    const apiKey = process.env.ABLY_API_KEY

    if (!apiKey) {
      throw new Error('ABLY_API_KEY no está configurada en las variables de entorno')
    }

    ablyServerInstance = new Ably.Rest({
      key: apiKey,
      httpRequestTimeout: 10000,
    })
  }

  return ablyServerInstance
}

export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const ably = getAblyServer()
    const channel = ably.channels.get(channelName)
    await channel.publish(eventName, data)
  } catch (error) {
    console.error(`[Ably] Error publicando en canal ${channelName}:`, error)
  }
}
