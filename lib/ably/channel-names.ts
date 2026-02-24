// lib/ably/channel-names.ts
// Centraliza los nombres de canales para evitar typos y facilitar cambios

export const ABLY_CHANNELS = {

 // Canal principal de una asamblea.
  asamblea: (asambleaId: string) => `asamblea:${asambleaId}`,

  //Canal de resultados en vivo para pantalla de presentación.
  resultados: (asambleaId: string) => `resultados:${asambleaId}`,
} as const

export const ABLY_EVENTS = {
  /** Cambio de estado de la asamblea (activa, finalizada, etc.) */
  ASAMBLEA_UPDATE: 'asamblea-update',

  /** Activación o cierre de confirmación de asistencia */
  CONFIRMACION: 'confirmacion',

  /** Nueva proposición creada o cambio de estado de proposición */
  PROPOSICION_UPDATE: 'proposicion-update',

  /** Un votante acaba de votar (para actualizar resultados live) */
  VOTO_REGISTRADO: 'voto-registrado',

  /** Actualización de resultados completos (para pantalla de presentación) */
  RESULTADOS_UPDATE: 'resultados-update',
} as const
