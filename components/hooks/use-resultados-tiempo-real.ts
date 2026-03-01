//components/hooks/use-resultados-tiempo-real,ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAblyClient } from '@/lib/ably/client'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'
import type { RealtimeChannel } from 'ably'


export interface ResultadosVivo {
    asamblea: {
        id: string
        tipo: string
        modalidad: string
        estado: string
        conjunto: {
            nombre: string
            coeficienteTotal: number
        }
    }
    quorum: {
        inicial: {
            porcentaje: number
            coeficiente: number
            votantes: number
        }
        final: {
            porcentaje: number
            coeficiente: number
            votantes: number
        } | null
        cierre: {
            porcentaje: number
            coeficiente: number
            votantes: number
        } | null
        confirmacionActivada: boolean
        registrosCerrados: boolean
        quorumAlCierreRegistros: number | null
        fechaCierreRegistros: string | null
    }
    proposiciones: Array<{
        id: string
        numeroOrden: number
        titulo: string
        estado: string
        opciones: Array<{
            id: string
            texto: string
            codigo: string | null
            orden: number
            votos: number
            coeficiente: number
            porcentaje: number
        }>
        noVotaron: {
            votos: number
            coeficiente: number
            porcentaje: number
        }
        totalVotos: number
        totalVotantes: number
        coeficienteVotado: number
        coeficienteDisponible: number
    }>
}

export function useResultadosTiempoReal(asambleaId: string) {
    const [datos, setDatos] = useState<ResultadosVivo | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)

    // Función para cargar datos
    const cargarDatos = useCallback(async () => {
        if (!asambleaId) return
        try {
            const response = await fetch(`/api/asambleas/${asambleaId}/resultados-vivo`)
            const data = await response.json()

            if (data.success) {
                setDatos(data.data)
                setError(null)
            } else {
                setError(data.error)
            }
        } catch (err) {
            setError('Error al cargar datos')
            console.error(err)
        } finally {
            setCargando(false)
        }
    }, [asambleaId])

    useEffect(() => {
        if (!asambleaId) {
            setCargando(false)
            return
        }

        // Cargar datos iniciales
        cargarDatos()

        // Canal para escuchar cambios 
        const setupAbly = async () => {
            try {
                const ably = getAblyClient()
                const channelName = ABLY_CHANNELS.asamblea(asambleaId)
                const channel = ably.channels.get(channelName)
                channelRef.current = channel

                // Todos disparan una recarga de datos del endpoint
                channel.subscribe(ABLY_EVENTS.VOTO_REGISTRADO, () => {
                    cargarDatos()
                })

                channel.subscribe(ABLY_EVENTS.PROPOSICION_UPDATE, () => {
                    cargarDatos()
                })

                channel.subscribe(ABLY_EVENTS.ASAMBLEA_UPDATE, () => {
                    cargarDatos()
                })

                channel.subscribe(ABLY_EVENTS.CONFIRMACION, () => {
                    cargarDatos()
                })
            }
            catch (err) {
                console.error('[Ably] Error en useResultadosTiempoReal:', err)
                // Fallback: si Ably falla, los datos iniciales ya fueron cargados
            }
        }
        setupAbly()

        // Cleanup al desmontar o cambiar asambleaId
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [asambleaId, cargarDatos])

    useEffect(() => {
        setCargando(true)
    }, [asambleaId])

    return { datos, cargando, error, recargar: cargarDatos }
}