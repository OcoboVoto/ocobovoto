//components/admin/controlVotacion.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Square, BarChart3, Ban, Minus, Trophy, XCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  resultados: any | null
  asambleaFinalizada?: boolean
  onActualizar?: () => void
}

export function ControlVotacion({ proposicion, resultados, asambleaFinalizada = false, onActualizar }: ControlVotacionProps) {
  const [loading, setLoading] = useState(false)
  const [anulando, setAnulando] = useState(false)
  const [confirmarAnular, setConfirmarAnular] = useState(false)

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

  const anularProposicion = async () => {
    setAnulando(true)
    try {
      const response = await fetch(`/api/proposiciones/${proposicion.id}/anular`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || 'Votación anulada')
        setConfirmarAnular(false)
        onActualizar?.()
      } else {
        toast.error(data.error || 'Error al anular')
      }
    } catch (error) {
      toast.error('Error al anular la votación')
    } finally {
      setAnulando(false)
    }
  }

  // Badge de estado
  const badgeEstado = {
    pendiente: 'bg-gray-100 text-gray-700',
    activa: 'bg-green-100 text-green-800',
    cerrada: 'bg-blue-100 text-blue-800',
    anulada: 'bg-red-100 text-red-700',
  }[proposicion.estado] ?? 'bg-gray-100 text-gray-700'

  const renderResultadoFinal = () => {

    if (proposicion.estado === 'anulada') {
      return (
        <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50">
          <p className="font-semibold text-red-700">VOTACIÓN ANULADA</p>
          <p className="text-sm text-red-600 mt-1">
            Esta votación fue anulada y no produce efectos.
          </p>
        </div>
      )
    }

    if (proposicion.estado !== 'cerrada' || !resultados?.resumen) return null

    const {
      aprobada,
      opcionGanadora,
      hayEmpate,
      totalVotos
    } = resultados.resumen

    // Caso A: sin votos
    if (totalVotos === 0) {
      return (
        <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-start gap-3">
          <Minus className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-700">SIN VOTOS</p>
            <p className="text-sm text-gray-500 mt-1">
              No se emitió ningún voto en esta proposición.
            </p>
          </div>
        </div>
      )
    }

    // Caso B: empate
    if (hayEmpate) {
      return (
        <div className="mt-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
          <p className="font-semibold text-yellow-800">EMPATE</p>
          <p className="text-sm text-yellow-700 mt-1">
            {opcionGanadora}
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            No se alcanza una mayoría suficiente.
          </p>
        </div>
      )
    }

    // Caso C: ganador único
    return (
      <div
        className={`mt-6 p-5 rounded-xl border ${aprobada
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
          }`}
      >
        <div className="flex items-start gap-3">
          <Trophy
            className={`h-5 w-5 mt-0.5 ${aprobada ? 'text-green-600' : 'text-red-600'
              }`}
          />
          <div>
            <p
              className={`font-semibold ${aprobada ? 'text-green-800' : 'text-red-800'
                }`}
            >
              {aprobada ? 'APROBADA' : 'RECHAZADA'}
            </p>

            <p className="text-sm text-gray-700 mt-1">
              Ganó: <strong>{opcionGanadora}</strong>
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Requerido: {proposicion.porcentajeRequerido}% de mayoría
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${proposicion.estado === 'anulada' ? 'opacity-70' : ''}`}>

      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1 pr-4">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeEstado}`}>
            {proposicion.estado.toUpperCase()}
          </span>

          <h3 className="text-lg font-semibold mt-2">
            {proposicion.numeroOrden}. {proposicion.titulo}
          </h3>

          {proposicion.descripcion && (
            <p className="text-sm text-gray-600 mt-2">
              {proposicion.descripcion}
            </p>
          )}
        </div>

        {/* Botones */}
        {!asambleaFinalizada && proposicion.estado !== 'anulada' && (
          <div className="flex items-center gap-2">

            {proposicion.estado === 'pendiente' && (
              <Button
                size="sm"
                onClick={() => cambiarEstado('abrir')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-1 h-3 w-3" />
                Abrir
              </Button>
            )}

            {proposicion.estado === 'activa' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cambiarEstado('cerrar')}
                disabled={loading}
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                <Square className="mr-1 h-3 w-3" />
                Cerrar
              </Button>
            )}

            {/*Botón de anular*/}
            {!confirmarAnular ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmarAnular(true)}
                disabled={loading}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Anular
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 font-medium whitespace-nowrap">
                  ¿Anular votación?
                </span>
                <div className="flex items-center gap-1 ml-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={anularProposicion}
                    disabled={anulando}
                    className="h-7 px-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 hover:text-white rounded-md"
                  >
                    {anulando ? '...' : 'Sí, anular'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmarAnular(false)}
                    className="h-7 px-2.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resultados */}
      {resultados?.resumen && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>
              {resultados.resumen.totalVotos} de {resultados.resumen.totalVotantes} votaron
            </span>
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

          {/*Resultado final */}
          {renderResultadoFinal()}

        </div>
      )}
    </div>
  )
}