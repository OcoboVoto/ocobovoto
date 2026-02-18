//components/hooks/use-resultados-tiempo-real,ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/createBrowserClient'

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

    const supabaseRealTime = supabase

    // Función para cargar datos
    const cargarDatos = async () => {
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
    }

    useEffect(() => {
        if (!asambleaId) {
            setCargando(false)
            return
        }

        // Cargar datos iniciales
        cargarDatos()

        // Canal para escuchar cambios 
        const channel = supabaseRealTime
            .channel(`asamblea-${asambleaId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'votos',
            }, () => {
                console.log("Cambio en votos")
                cargarDatos()
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'confirmaciones_asistencia',
            }, cargarDatos)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'votantes',
            }, cargarDatos)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'proposiciones',
            }, cargarDatos)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'asambleas',
                //filter: `id=eq.${asambleaId}`,
            }, () => {
                console.log("Cambio en asamblea")
                cargarDatos()
            })
            .subscribe((status) => {
                console.log("Realtime status:", status)
            })

        // Cleanup al desmontar
        return () => {
            supabase.removeChannel(channel)
        }
    }, [asambleaId])

    useEffect(() => {
        setCargando(true)
    }, [asambleaId])

    return { datos, cargando, error, recargar: cargarDatos }
}