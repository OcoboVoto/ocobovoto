//app/resultados-vivo/[id]/page.tsx
'use client'

import { CardQuorum } from '@/components/resultados-vivo/CardQuorum'
import { CardProposicion } from '@/components/resultados-vivo/CardProposicion'
import { Loader2, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResultadosTiempoReal } from '@/components/hooks/use-resultados-tiempo-real'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResultadosVivoPage() {
    const params = useParams()
    const asambleaId = params?.id as string
    const { datos, cargando, error, recargar } = useResultadosTiempoReal(asambleaId)

    // Usar las proposiciones originales de datos?.proposiciones, pero no redeclarar si ya existe
    const proposicionesOrdenadas = [...(datos?.proposiciones ?? [])].sort((a, b) => {
        const prioridadEstado = (estado: string) => {
            switch (estado) {
                case 'activa':
                    return 1
                case 'en_curso':
                    return 2
                case 'cerrada':
                    return 3
                default:
                    return 4
            }
        }

        const estadoDiff = prioridadEstado(a.estado) - prioridadEstado(b.estado)

        if (estadoDiff !== 0) {
            return estadoDiff
        }

        // Si tienen mismo estado, ordenar por numeroOrden descendente
        return b.numeroOrden - a.numeroOrden
    })


    if (cargando) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-700">
                        Cargando resultados en vivo...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !datos) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Error al cargar datos
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {error || 'No se pudieron cargar los resultados'}
                    </p>
                    <Button onClick={recargar} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar
                    </Button>
                </div>
            </div>
        )
    }

    const { asamblea, quorum, proposiciones } = datos

    if (asamblea.estado !== 'activa') {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-md text-center">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Asamblea no disponible
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Esta pantalla solo está disponible mientras la asamblea esté activa.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-lg border-b-4 border-blue-600">
                <div className="container mx-auto px-8 py-12 max-w-7x1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                                <TrendingUp className="h-8 w-8 text-blue-600" />
                                Resultados en Vivo
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {asamblea.conjunto.nombre} - {asamblea.tipo}
                            </p>
                        </div>

                        {/* Indicador de actualización en vivo */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full border border-green-300">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-sm font-semibold">En vivo</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={recargar}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Actualizar
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="container mx-auto px-4 py-8">
                {/* Quórum */}
                <div className="mb-8">
                    <CardQuorum quorum={quorum} />
                </div>

                {/* Mensaje si no hay proposiciones */}
                {proposiciones.length === 0 && (
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-12 text-center">
                        <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-3xl font-bold text-gray-900 mb-2">
                            Sin votaciones activas
                        </h3>
                        <p className="text-gray-600">
                            Las proposiciones aparecerán aquí cuando se abran las votaciones
                        </p>
                    </div>
                )}

                {/* Lista de proposiciones */}
                {proposiciones.length > 0 && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-3xl font-bold text-gray-900">
                                Proposiciones y Votaciones
                            </h2>
                            <div className="text-sm text-gray-600">
                                {proposiciones.filter(p => p.estado === 'abierta').length} activa(s) • {' '}
                                {proposiciones.filter(p => p.estado === 'cerrada').length} cerrada(s)
                            </div>
                        </div>

                        <AnimatePresence mode="popLayout">
                            {proposicionesOrdenadas
                                .map((proposicion) => (
                                    <CardProposicion
                                        key={proposicion.id}
                                        proposicion={proposicion}
                                    />
                                ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
                    <p>
                        Los resultados se actualizan automáticamente en tiempo real
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                        Última actualización: {new Date().toLocaleTimeString('es-CO')}
                    </p>
                </div>
            </footer>
        </div>
    )
}