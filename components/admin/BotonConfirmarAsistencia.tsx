'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, CheckCircle2, Users } from 'lucide-react'
import { toast } from 'sonner'

type EstadoConfirmacion = 'never-used' | 'active' | 'closed'

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
    const [loading, setLoading] = useState(false)


    useEffect(() => {
        cargarEstadoAsamblea()
    }, [asambleaId])

    const cargarEstadoAsamblea = async () => {
        try {
            const response = await fetch(`/api/asambleas/${asambleaId}`)
            const data = await response.json()
            if (!data.success) return
            const asamblea = data.data

            if (asamblea.confirmacionCerrada) {
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
                //setEstado('active')
                await cargarEstadoAsamblea()
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

    if (estado === 'never-used') {
        return (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                        <UserCheck className="h-6 w-6 text-yellow-700" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-yellow-900 mb-2">
                            Confirmación de Asistencia
                        </h3>
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
    if (estado === 'active') {
        return (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-700" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-green-900">
                                Confirmación Activa
                            </h3>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Tiempo restante:</p>
                                <p className={`text-2xl font-bold ${tiempoRestante < 60 ? 'text-red-600' : 'text-green-700'
                                    }`}>
                                    {formatearTiempo(tiempoRestante)}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-green-800 mb-4">
                            Los votantes están confirmando su asistencia. El quórum se recalculará automáticamente.
                        </p>

                        <div className="bg-white rounded-lg p-4 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Progreso de confirmación:</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {confirmaciones} de {totalVotantes}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${totalVotantes > 0 ? (confirmaciones / totalVotantes) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
                                <Users className="h-4 w-4" />
                                <span>
                                    {totalVotantes - confirmaciones} votantes por confirmar
                                </span>
                            </div>
                        </div>
                        <Button
                            onClick={cerrarConfirmacion}
                            disabled={cerrando}
                            variant="outline"
                            className="w-full"
                        >
                            {cerrando ? 'Cerrando...' : 'Cerrar Confirmación Manualmente'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">
                        Confirmación Cerrada
                    </h3>
                    <p className="text-sm text-gray-700">
                        {confirmaciones} de {totalVotantes} votantes confirmaron su asistencia.
                        El quórum final ha sido calculado.
                    </p>
                </div>
            </div>
        </div>
    )

}