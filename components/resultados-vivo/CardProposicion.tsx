// components/resultados-vivo/CardProposicion.tsx

'use client'

import { AnimatedNumber } from './AnimatedNumber'
import { GraficoTorta } from './GraficoTorta'
import { TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'


interface OpcionResultado {
    id: string
    texto: string
    codigo: string | null
    orden: number
    votos: number
    coeficiente: number
    porcentaje: number
}

interface ProposicionData {
    id: string
    numeroOrden: number
    titulo: string
    estado: string
    opciones: OpcionResultado[]
    noVotaron: {
        votos: number
        coeficiente: number
        porcentaje: number
    }
    totalVotos: number
    totalVotantes: number
    coeficienteVotado: number
    coeficienteDisponible: number
}

interface CardProposicionProps {
    proposicion: ProposicionData
}

// Paleta de colores para las opciones
const COLORES = [
    '#10b981', // Verde
    '#ef4444', // Rojo
    '#3b82f6', // Azul
    '#f59e0b', // Amarillo
    '#8b5cf6', // Púrpura
    '#ec4899', // Rosa
    '#14b8a6', // Teal
    '#f97316', // Naranja
]

const COLOR_NO_VOTO = '#9ca3af' // Gris

export function CardProposicion({ proposicion }: CardProposicionProps) {
    const { opciones, noVotaron, totalVotos, totalVotantes, coeficienteVotado } = proposicion
    const [highlight, setHighlight] = useState(false)

    useEffect(() => {
        setHighlight(true)
        const t = setTimeout(() => setHighlight(false), 1500)
        return () => clearTimeout(t)
    }, [proposicion.totalVotos])

    // Preparar datos para el gráfico de torta
    const datosGrafico = [
        ...opciones.map((opcion, index) => ({
            nombre: opcion.texto,
            valor: opcion.votos,
            porcentaje: opcion.porcentaje,
            color: COLORES[index % COLORES.length],
        })),
        {
            nombre: 'No votaron',
            valor: noVotaron.votos,
            porcentaje: noVotaron.porcentaje,
            color: COLOR_NO_VOTO,
        },
    ]

    // Porcentaje de participación
    const porcentajeParticipacion = totalVotantes > 0
        ? (totalVotos / totalVotantes) * 100
        : 0

    const estadoBadge = proposicion.estado === 'abierta'
        ? 'bg-green-100 text-green-800 border-green-300'
        : 'bg-gray-100 text-gray-800 border-gray-300'

    return (

        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                            #{proposicion.numeroOrden}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${estadoBadge}`}>
                            {proposicion.estado.toUpperCase()}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {proposicion.titulo}
                    </h3>
                </div>
            </div>
                {/* Métricas rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                            {totalVotos}
                        </div>
                        <div className="text-xs text-blue-700 font-medium">
                            Han votado
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-2xl font-bold text-gray-600">
                            {noVotaron.votos}
                        </div>
                        <div className="text-xs text-gray-700 font-medium">
                            No han votado
                        </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">
                            {porcentajeParticipacion.toFixed(1)}%
                        </div>
                        <div className="text-xs text-purple-700 font-medium">
                            Participación
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                            {coeficienteVotado.toFixed(2)}%
                        </div>
                        <div className="text-xs text-green-700 font-medium">
                            Coef. Votaron
                        </div>
                    </div>
                </div>

                {/* Gráfico de torta */}
                <div className="mb-6">
                    <GraficoTorta datos={datosGrafico} />
                </div>

                {/* Tabla de resultados detallados */}
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Opción
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Votos
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Coeficiente
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Porcentaje
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {opciones.map((opcion, index) => (
                                <tr key={opcion.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORES[index % COLORES.length] }}
                                            />
                                            <span className="font-medium text-gray-900">
                                                {opcion.texto}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                                        {opcion.votos}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                                        {opcion.coeficiente.toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                                            <TrendingUp className="h-4 w-4" />
                                            {opcion.porcentaje.toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-medium">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLOR_NO_VOTO }}
                                        />
                                        <span className="text-gray-600">No votaron</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    {noVotaron.votos}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    <AnimatedNumber value={noVotaron.coeficiente} />%
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    <AnimatedNumber value={noVotaron.porcentaje} />%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            {/* Nota sobre coeficiente */}
            <div className="mt-4 text-xs text-gray-500 italic text-center">
                * El coeficiente mostrado corresponde únicamente a quienes han emitido su voto
            </div>
        </div>
    )
}