// components/hooks/use-votacion-polling.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Proposicion {
    id: string
    numeroOrden: number
    titulo: string
    descripcion: string
    tipoPregunta: string
    opciones: Array<{
        id: string
        texto: string
        codigo: string
    }>
    yaVoto: boolean
}

interface VotacionEstado {
    proposiciones: Proposicion[]
    confirmacionActivada: boolean
    asambleaEstado: string
    linkZoom: string | null
    modalidad: string | null
}

interface UseVotacionPollingOptions {
    asambleaId: string
    cedula: string | null
    /** Intervalo en ms. Default: 5000 (5 segundos) */
    intervalo?: number
    /** Solo hacer polling si está autenticado */
    activo?: boolean
}

export function useVotacionPolling({
    asambleaId,
    cedula,
    intervalo = 5000,
    activo = true,
}: UseVotacionPollingOptions) {
    const [estado, setEstado] = useState<VotacionEstado | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    // Guardar el estado previo para detectar cambios reales (evitar re-renders innecesarios)
    const prevHashRef = useRef<string>('')

    const fetchEstado = useCallback(async () => {
        if (!cedula || !asambleaId) return

        try {
            const response = await fetch(`/api/votacion/${asambleaId}?cedula=${cedula}`)
            const data = await response.json()

            if (data.success) {
                // Hash simple para detectar si algo cambió realmente
                const nuevoHash = JSON.stringify({
                    props: data.data.proposiciones.map((p: Proposicion) => ({
                        id: p.id,
                        yaVoto: p.yaVoto,
                    })),
                    confirmacion: data.data.confirmacionActivada,
                    estado: data.data.asambleaEstado,
                })

                // Solo actualizar state si algo cambió (optimización de renders)
                if (nuevoHash !== prevHashRef.current) {
                    prevHashRef.current = nuevoHash
                    setEstado({
                        proposiciones: data.data.proposiciones,
                        confirmacionActivada: data.data.confirmacionActivada ?? false,
                        asambleaEstado: data.data.asambleaEstado ?? 'activa',
                        linkZoom: data.data.linkZoom ?? null,
                        modalidad: data.data.modalidad ?? null,
                    })
                }
                setError(null)
            } else {
                setError(data.error)
            }
        } catch (err) {
            // En polling, un error de red no es crítico — el próximo poll lo reintenta
            console.warn('[Polling] Error de red, reintentando en próximo ciclo:', err)
        } finally {
            setCargando(false)
        }
    }, [asambleaId, cedula])

    useEffect(() => {
        if (!activo || !cedula) {
            setCargando(false)
            return
        }

        // Fetch inmediato al autenticarse
        fetchEstado()

        // Iniciar polling
        intervalRef.current = setInterval(fetchEstado, intervalo)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [activo, cedula, asambleaId, fetchEstado, intervalo])

    // Función para forzar refresh inmediato (ej: después de votar)
    const refrescarAhora = useCallback(() => {
        fetchEstado()
    }, [fetchEstado])

    return { estado, cargando, error, refrescarAhora }
}
