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
    intervalo?: number
    activo?: boolean
}

export function useVotacionPolling({
    asambleaId,
    cedula,
    intervalo = 30000,
    activo = true,
}: UseVotacionPollingOptions) {
    const [estado, setEstado] = useState<VotacionEstado | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const prevHashRef = useRef<string>('')
    const inflightRef = useRef<boolean>(false)
    const mountedRef = useRef<boolean>(true)
    const cedulaRef = useRef<string | null>(cedula)
    const asambleaIdRef = useRef<string>(asambleaId)
    const intervaloRef = useRef<number>(intervalo)

    // Mantener refs sincronizados con props actuales
    useEffect(() => { cedulaRef.current = cedula }, [cedula])
    useEffect(() => { asambleaIdRef.current = asambleaId }, [asambleaId])
    useEffect(() => { intervaloRef.current = intervalo }, [intervalo])

    const fetchEstado = useCallback(async () => {
        const cedula = cedulaRef.current
        const asambleaId = asambleaIdRef.current

        if (!cedula || !asambleaId) return

        //Si ya hay un request en vuelo, no lanzar otro
        if (inflightRef.current) {
            console.debug('[Polling] Request en vuelo, saltando ciclo')
            return
        }

        inflightRef.current = true

        try {
            const response = await fetch(`/api/votacion/${asambleaId}?cedula=${cedula}`,
                { signal: AbortSignal.timeout(10000) }
            )

            //Si el componente se desmontó mientras esperábamos, ignorar
            if (!mountedRef.current) return

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
        } catch (err: any) {
            if (!mountedRef.current) return
            if (err?.name === 'TimeoutError') {
                console.warn('[Polling] Request timeout — reintentando en próximo ciclo')
            } else {
                console.warn('[Polling] Error de red — reintentando en próximo ciclo:', err)
            }
        } finally {
            if (mountedRef.current) {
                setCargando(false)
            }
            inflightRef.current = false
        }
    }, [])

    // Helper para iniciar/reiniciar el intervalo 
    const iniciarIntervalo = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        intervalRef.current = setInterval(fetchEstado, intervaloRef.current)
    }, [fetchEstado])

    //  Efecto principal: arrancar/detener el polling 
    useEffect(() => {
        mountedRef.current = true

        if (!activo || !cedula) {
            setCargando(false)
            return
        }

        // Fetch inmediato al autenticarse
        fetchEstado()

        // Iniciar polling
        iniciarIntervalo()

        return () => {
            mountedRef.current = false
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [activo, cedula, asambleaId])

    // Refresh Manual
    const refrescarAhora = useCallback(() => {
        fetchEstado()
        if (intervalRef.current) {
            iniciarIntervalo()
        }
    }, [fetchEstado, iniciarIntervalo])

    return { estado, cargando, error, refrescarAhora }
}
