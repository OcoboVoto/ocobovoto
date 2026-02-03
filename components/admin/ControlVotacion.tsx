'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Square, BarChart3 } from 'lucide-react'

interface Proposicion {
  id: string
  numeroOrden: number
  titulo: string
  descripcion: string
  estado: string
  tipoPregunta: string
  porcentajeRequerido: number
  opciones: any[]
}

interface ControlVotacionProps {
  proposicion: Proposicion
  onActualizar?: () => void
}

export function ControlVotacion({ proposicion, onActualizar }: ControlVotacionProps) {
  const [resultados, setResultados] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (proposicion.estado === 'activa' || proposicion.estado === 'cerrada') {
      fetchResultados()
      const interval = setInterval(fetchResultados, 3000)
      return () => clearInterval(interval)
    }
  }, [proposicion.id, proposicion.estado])

  const fetchResultados = async () => {
    try {
      const response = await fetch(`/api/proposiciones/${proposicion.id}/resultados`)
      const data = await response.json()
      if (data.success) {
        setResultados(data.data)
      }
    } catch (error) {
      console.error('Error al cargar resultados:', error)
    }
  }

  const cambiarEstado = async (accion: 'abrir' | 'cerrar') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/proposiciones/${proposicion.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      })

      const data = await response.json()
      if (data.success) {
        onActualizar?.()
      }
    } catch (error) {
      alert('Error al cambiar estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {proposicion.numeroOrden}. {proposicion.titulo}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{proposicion.descripcion}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          proposicion.estado === 'activa' ? 'bg-green-100 text-green-800' :
          proposicion.estado === 'cerrada' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {proposicion.estado.toUpperCase()}
        </span>
      </div>

      {/* Controles */}
      <div className="flex gap-2 mb-4">
        {proposicion.estado === 'pendiente' && (
          <Button onClick={() => cambiarEstado('abrir')} disabled={loading}>
            <Play className="mr-2 h-4 w-4" />
            Abrir Votación
          </Button>
        )}
        {proposicion.estado === 'activa' && (
          <Button onClick={() => cambiarEstado('cerrar')} variant="destructive" disabled={loading}>
            <Square className="mr-2 h-4 w-4" />
            Cerrar Votación
          </Button>
        )}
      </div>

      {/* Resultados */}
      {resultados && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>{resultados.resumen.totalVotos} de {resultados.resumen.totalVotantes} votaron</span>
          </div>

          {resultados.resultados.map((resultado: any) => (
            <div key={resultado.opcionId}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{resultado.texto}</span>
                <span className="text-gray-600">
                  {resultado.porcentaje.toFixed(1)}% • {resultado.personas} votos
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${resultado.porcentaje}%` }}
                />
              </div>
            </div>
          ))}

          {/* No votaron */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-500">No votaron</span>
              <span className="text-gray-600">
                {resultados.noVotaron.porcentaje.toFixed(1)}% • {resultados.noVotaron.personas} personas
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-orange-400 h-3 rounded-full transition-all"
                style={{ width: `${resultados.noVotaron.porcentaje}%` }}
              />
            </div>
          </div>

          {/* Resultado final */}
          {proposicion.estado === 'cerrada' && (
            <div className={`mt-4 p-4 rounded-lg ${
              resultados.resumen.aprobada ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`font-semibold ${
                resultados.resumen.aprobada ? 'text-green-800' : 'text-red-800'
              }`}>
                {resultados.resumen.aprobada ? 'APROBADA' : 'RECHAZADA'}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Ganó: {resultados.resumen.opcionGanadora}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}