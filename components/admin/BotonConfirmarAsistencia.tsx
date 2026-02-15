//components/admin/bototonConfirmarAsistecia.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'

const MAX_CONFIRMACIONES = 2
type EstadoConfirmacion = 'never-used' | 'active' | 'closed' | 'agotado'

interface BotonConfirmarAsistenciaProps {
    asambleaId: string
    onActualizar?: () => void
}

export function BotonConfirmarAsistencia({ asambleaId, onActualizar, }: BotonConfirmarAsistenciaProps) {

    const [activando, setActivando] = useState(false)
    const [cerrando, setCerrando] = useState(false)
    const [confirmaciones, setConfirmaciones] = useState(0)
    const [totalVotantes, setTotalVotantes] = useState(0)
    const [tiempoRestante, setTiempoRestante] = useState(60)
    const [estado, setEstado] = useState<EstadoConfirmacion>('never-used')
    const [confirmacionUsada, setConfirmacionUsada] = useState(0)

    useEffect(() => {
        cargarEstadoAsamblea()
    }, [asambleaId])

    const cargarEstadoAsamblea = async () => {
        try {
            const response = await fetch(`/api/asambleas/${asambleaId}`)
            const data = await response.json()
            if (!data.success) return
            const asamblea = data.data

            const usada = asamblea.confirmacionUsada ?? 0
            setConfirmacionUsada(usada)

            if (usada >= MAX_CONFIRMACIONES && !asamblea.confirmacionActivada) {
                setEstado('agotado')
            } else if (asamblea.confirmacionCerrada) {
                setEstado('closed')
                setTiempoRestante(0)
            } else if (asamblea.confirmacionActivada) {
                setEstado('active')
            } else {
                setEstado('never-used')
            }
            actualizarConteo(asamblea)
        } catch (e) {
            console.error('Error cargando estado de asamblea', e)
        }
    }

    //Timer solo si está activa
    useEffect(() => {
        if (estado !== 'active') return
        const interval = setInterval(() => {
            setTiempoRestante(prev => {
                if (prev <= 1) {
                    cerrarConfirmacion()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [estado])


    //Polling
    useEffect(() => {
        if (estado !== 'active') return

        const interval = setInterval(cargarEstadoAsamblea, 3000)
        return () => clearInterval(interval)
    }, [estado])

    //Acciones
    const activarConfirmacion = async () => {
        setActivando(true)
        try {
            const response = await fetch(`/api/asambleas/${asambleaId}/confirmar-asistencia`, {
                method: 'POST',
            })
            const data = await response.json()

            if (data.success) {
                await cargarEstadoAsamblea()
                setTiempoRestante(60)
                toast.success('Confirmación de asistencia activada. Los votantes recibirán la notificación.')
                onActualizar?.()
            } else {
                toast.error('Error al activar confirmación: ' + data.error)
            }
        } catch (error) {
            toast.error('Error al activar confirmación')
        } finally {
            setActivando(false)
        }
    }

    const cerrarConfirmacion = async () => {
        if (estado !== 'active') return
        setCerrando(true)
        try {
            const response = await fetch(`/api/asambleas/${asambleaId}/cerrar-confirmacion`, {
                method: 'POST',
            })

            const data = await response.json()
            if (data.success) {
                setEstado('closed')
                setTiempoRestante(0)
                toast.success('Confirmación cerrada. ' + data.data.totalConfirmados + ' de ' + data.data.totalVotantes + ' confirmaron.')
                onActualizar?.()
            } else {
                toast.error('Error al cerrar confirmación: ' + data.error)
            }
        } catch (error) {
            toast.error('Error al cerrar confirmación')
        } finally {
            setCerrando(false)
        }
    }

    const actualizarConteo = (asamblea: any) => {
        const votantes = asamblea.votantes ?? []
        const confirmados = votantes.filter((v: any) => v.confirmoAsistencia)
        setConfirmaciones(confirmados.length)
        setTotalVotantes(votantes.length)
    }

    const formatearTiempo = (segundos: number) => {
        const mins = Math.floor(segundos / 60)
        const secs = segundos % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const usosRestantes = MAX_CONFIRMACIONES - confirmacionUsada

    if (estado === 'never-used') {
        return (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                        <UserCheck className="h-6 w-6 text-yellow-700" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-yellow-900 mb-2">
                                Confirmación de Asistencia
                            </h3>
                            <span className="text-xs font-semibold bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                                {usosRestantes} de {MAX_CONFIRMACIONES} disponibles
                            </span>
                        </div>
                        <p className="text-sm text-yellow-800 mb-4">
                            Activa esto a mitad de asamblea para recalcular el quórum solo con quienes siguen presentes.
                            Los votantes deberán confirmar que continúan en la asamblea.
                        </p>
                        <Button
                            onClick={activarConfirmacion}
                            disabled={activando}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            <UserCheck className="mr-2 h-4 w-4" />
                            {activando ? 'Activando...' : 'Solicitar Confirmación Ahora'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }


  //  Estado: confirmación activa ahora mismo
  if (estado === 'active') {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <UserCheck className="h-6 w-6 text-green-700 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-green-900">
                Confirmación #{confirmacionUsada} Activa
              </h3>
              <span className="text-xs font-semibold bg-green-200 text-green-800 px-2 py-1 rounded-full">
                {usosRestantes} restante{usosRestantes !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700 mb-1">
              {confirmaciones} / {totalVotantes} confirmados
            </p>
            <p className="text-sm text-green-700 mb-4">
              Tiempo restante: <strong>{formatearTiempo(tiempoRestante)}</strong>
            </p>
            <Button
              onClick={cerrarConfirmacion}
              disabled={cerrando}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-100"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {cerrando ? 'Cerrando...' : 'Cerrar Confirmación Ahora'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  //  Estado: confirmación cerrada, aún quedan usos
  if (estado === 'closed' && usosRestantes > 0) {
    return (
      <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-blue-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-blue-900">
                Confirmación #{confirmacionUsada} Cerrada
              </h3>
              <span className="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                {usosRestantes} restante{usosRestantes !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-blue-800 mb-4">
              <strong>{confirmaciones}</strong> de <strong>{totalVotantes}</strong> votantes confirmaron asistencia.
              Puedes activar <strong>{usosRestantes} confirmación{usosRestantes !== 1 ? 'es más' : ' más'}</strong>.
            </p>
            <Button onClick={activarConfirmacion} disabled={activando} className="bg-blue-600 hover:bg-blue-700">
              <UserCheck className="mr-2 h-4 w-4" />
              {activando ? 'Activando...' : `Activar Confirmación #${confirmacionUsada + 1}`}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  //  Estado: agotadas las 2 confirmaciones
  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-700">Confirmaciones Agotadas</h3>
            <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
              {MAX_CONFIRMACIONES}/{MAX_CONFIRMACIONES} usadas
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Se han utilizado las <strong>{MAX_CONFIRMACIONES} confirmaciones</strong> permitidas.
            Último resultado: <strong>{confirmaciones}</strong> de <strong>{totalVotantes}</strong> confirmaron.
          </p>
        </div>
      </div>
    </div>
  )
}