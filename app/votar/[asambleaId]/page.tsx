//app/votar/[asambleaId]//page.tsx
'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Vote, LogOut, UserCheck, Video, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { getAblyClient } from '@/lib/ably/client'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'
import type { RealtimeChannel } from 'ably'

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

interface Votante {
    id: string
    nombreCompleto: string
    coeficienteTotal: number
    confirmoAsistencia: boolean
}

export default function VotacionPage({
    params,
}: {
    params: Promise<{ asambleaId: string }>
}) {
    const [inicializando, setInicializando] = useState(true)
    const { asambleaId } = use(params)
    const [cedula, setCedula] = useState('')
    const [autenticado, setAutenticado] = useState(false)
    const [votante, setVotante] = useState<Votante | null>(null)
    const [proposiciones, setProposiciones] = useState<Proposicion[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [votando, setVotando] = useState<string | null>(null)
    const [mostrarAlertaConfirmacion, setMostrarAlertaConfirmacion] = useState(false)
    const [confirmando, setConfirmando] = useState(false)
    const [modalidadAsamblea, setModalidadAsamblea] = useState<string | null>(null)
    const [linkZoom, setLinkZoom] = useState<string | null>(null)
    const ablyChannelRef = useRef<RealtimeChannel | null>(null)

    //Helpers 
    const refrescarProposiciones = useCallback(async (cedulaValue: string) => {
        try {
            const response = await fetch(`/api/votacion/${asambleaId}?cedula=${cedulaValue}`)
            const data = await response.json()
            if (data.success) {
                setProposiciones(data.data.proposiciones)
            }
        } catch (err) {
            console.error('[Ably] Error refrescando proposiciones:', err)
        }
    }, [asambleaId])

    const autenticarConCedula = useCallback(async (cedulaValue: string) => {
        if (cedulaValue.length < 6) {
            setError('Ingresa una cédula válida')
            return
        }
        setLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/votacion/${asambleaId}?cedula=${cedulaValue}`)
            const data = await response.json()

            if (data.success) {
                setCedula(cedulaValue)
                setVotante(data.data.votante)
                setProposiciones(data.data.proposiciones)
                setAutenticado(true)
                setModalidadAsamblea(data.data.modalidad ?? null)
                setLinkZoom(data.data.linkZoom ?? null)
                sessionStorage.setItem('cedula_votante', cedulaValue)

                // Verificar si la confirmación ya está activa al momento de autenticarse
                if (data.data.confirmacionActivada && !data.data.votante.confirmoAsistencia) {
                    setMostrarAlertaConfirmacion(true)
                }
            } else {
                setError(data.error || 'Cédula no encontrada en esta asamblea')
                sessionStorage.removeItem('cedula_votante')
            }
        } catch (err) {
            setError('Error de conexión. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }, [asambleaId])

    const autenticar = () => autenticarConCedula(cedula)

    const cerrarSesion = () => {
        // Limpiar canal Ably antes de cerrar sesión
        if (ablyChannelRef.current) {
            ablyChannelRef.current.unsubscribe()
            ablyChannelRef.current = null
        }
        sessionStorage.removeItem('cedula_votante')
        setAutenticado(false)
        setCedula('')
        setVotante(null)
        setProposiciones([])
        setModalidadAsamblea(null)
        setLinkZoom(null)
    }

    const confirmarAsistencia = async () => {
        if (!votante) return
        setConfirmando(true)

        try {
            const response = await fetch('/api/confirmacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asambleaId,
                    votanteId: votante?.id,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setVotante(prev => prev ? {
                    ...prev,
                    confirmoAsistencia: true,
                } : null)
                setMostrarAlertaConfirmacion(false)
                toast.success('Asistencia confirmada exitosamente')
            } else {
                toast.error('Error al confirmar asistencia: ' + data.error)
            }
        } catch (error) {
            toast.error('Error al confirmar asistencia')
        } finally {
            setConfirmando(false)
        }
    }

    //Auto-autenticar 
    useEffect(() => {
        const restaurarSesion = async () => {
            const cedulaGuardada = sessionStorage.getItem('cedula_votante')
            if (cedulaGuardada) {
                await autenticarConCedula(cedulaGuardada)
            }
            setInicializando(false)
        }
        restaurarSesion()
    }, [asambleaId, autenticarConCedula])

    // Ably REALTIME
    useEffect(() => {
        if (!autenticado || !cedula || !votante) return

        const setupAbly = async () => {
            try {
                const ably = getAblyClient()
                const channelName = ABLY_CHANNELS.asamblea(asambleaId)
                const channel = ably.channels.get(channelName)
                ablyChannelRef.current = channel

                // Evento: nueva proposición o cambio de estado (abrir/cerrar votación)
                channel.subscribe(ABLY_EVENTS.PROPOSICION_UPDATE, async () => {
                    await refrescarProposiciones(cedula)
                })

                // Evento: un voto fue registrado — actualizar estado local si es del votante actual
                // (El server también puede publicar esto con el votante_id)
                channel.subscribe(ABLY_EVENTS.VOTO_REGISTRADO, (message) => {
                    const { votanteId, proposicionId } = message.data || {}
                    // Solo actualizar si es el voto de ESTE votante
                    if (votanteId === votante.id && proposicionId) {
                        setProposiciones(props =>
                            props.map(p =>
                                p.id === proposicionId ? { ...p, yaVoto: true } : p
                            )
                        )
                    }
                })

                // Evento: confirmación de asistencia activada o cerrada por el admin
                channel.subscribe(ABLY_EVENTS.CONFIRMACION, (message) => {
                    const data = message.data || {}

                    if (data.confirmacionActivada && !votante.confirmoAsistencia) {
                        setMostrarAlertaConfirmacion(true)
                    }

                    if (!data.confirmacionActivada || data.confirmacionCerrada) {
                        setMostrarAlertaConfirmacion(false)
                    }
                })

                // Evento: cambio de estado de la asamblea (ej: finalizada)
                channel.subscribe(ABLY_EVENTS.ASAMBLEA_UPDATE, async (message) => {
                    const data = message.data || {}
                    if (data.estado === 'finalizada') {
                        // Refrescar proposiciones para reflejar cierre de votaciones
                        await refrescarProposiciones(cedula)
                    }
                })

                if (process.env.NODE_ENV === 'development') {
                    console.log('[Ably] Votante suscrito al canal:', channelName)
                }
            } catch (err) {
                console.error('[Ably] Error al conectar en página de votación:', err)
            }
        }

        // Verificación inicial (solo 1 vez)
        /*const verificarConfirmacionInicial = async () => {
            try {
                const response = await fetch(`/api/asambleas/${asambleaId}`)
                const data = await response.json()
                if (data.success && data.data.confirmacionActivada && !data.data.confirmacionCerrada) {
                    const yaConfirmo = data.data.votantes?.find(
                        (v: any) => v.id === votante.id
                    )
                    if (yaConfirmo && !yaConfirmo.confirmoAsistencia) {
                        setMostrarAlertaConfirmacion(true)
                    }
                }
            } catch (error) {
                console.error('Error al verificar confirmación:', error)
            }
        }

        verificarConfirmacionInicial()*/

        setupAbly()

        return () => {
            if (ablyChannelRef.current) {
                ablyChannelRef.current.unsubscribe()
                ablyChannelRef.current = null
            }
        }
    }, [autenticado, cedula, votante, asambleaId, refrescarProposiciones])

    const emitirVoto = async (proposicionId: string, opcionId: string) => {
        if (!cedula || votando) return
        setVotando(proposicionId)
        setError('')

        try {
            const response = await fetch('/api/votos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposicionId,
                    votanteId: votante?.id,
                    opcionId,
                    cedula
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Marcar como votada
                setProposiciones(props =>
                    props.map(p =>
                        p.id === proposicionId ? { ...p, yaVoto: true } : p
                    )
                )
                toast.success('¡Voto registrado exitosamente!')
            } else {
                toast.error('Error al votar: ' + (data.error || 'Error desconocido'))
                setError(data.error)
            }
        } catch (error) {
            toast.error('Error de conexión al votar')
            setError('Error al registrar voto')
        } finally {
            setVotando(null)
        }
    }

    // RENDER 

    if (inicializando) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="text-gray-600">Cargando sesión…</span>
            </div>
        )
    }

    // Pantalla de Login
    if (!autenticado) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                            <Vote className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Panel de Votación
                        </h1>
                        <p className="text-gray-600">
                            Ingresa tu cédula para votar
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Cédula
                            </label>
                            <Input
                                type="text"
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                placeholder="1234567890"
                                maxLength={12}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') autenticar()
                                }}
                            />
                        </div>

                        <Button
                            onClick={autenticar}
                            disabled={loading || cedula.length < 6}
                            className="w-full"
                        >
                            {loading ? 'Verificando...' : 'Ingresar'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // condición para mostrar banner de Zoom 
    const esVirtualOHibrida = modalidadAsamblea === 'virtual' || modalidadAsamblea === 'hibrida'
    const mostrarZoom = esVirtualOHibrida && linkZoom

    // Pantalla de Votación
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Panel de Votación
                            </h1>
                            <p className="text-sm text-gray-600">
                                {votante?.nombreCompleto}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={cerrarSesion}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            {/*Banner de Zoom  */}
            {mostrarZoom && (
                <div className="bg-blue-600 border-b-4 border-blue-700">
                    <div className="max-w-4xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-2">
                                    <Video className="h-5 w-5 text-red" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm">
                                        Asamblea {modalidadAsamblea === 'hibrida' ? 'Híbrida' : 'Virtual'}
                                    </p>
                                    <p className="text-blue-100 text-xs">
                                        Únete a la sesión en línea para participar
                                    </p>
                                </div>
                            </div>
                            <a
                                href={linkZoom!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 transition-colors font-semibold text-sm px-4 py-2 rounded-lg"
                            >
                                Unirse a Zoom
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerta de Confirmación */}
            {mostrarAlertaConfirmacion && (
                <div className="bg-yellow-500 border-b-4 border-yellow-600">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserCheck className="h-6 w-6 text-white" />
                                <div>
                                    <p className="font-semibold text-white">
                                        ¿Sigues presente en la asamblea?
                                    </p>
                                    <p className="text-sm text-yellow-100">
                                        Por favor confirma tu asistencia para continuar participando
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={confirmarAsistencia}
                                disabled={confirmando}
                                className="bg-white text-yellow-700 hover:bg-yellow-50"
                            >
                                {confirmando ? 'Confirmando...' : 'Confirmar Asistencia'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {proposiciones.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                        <Vote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay votaciones activas
                        </h3>
                        <p className="text-gray-600">
                            Espera a que el administrador abra una votación
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {proposiciones.map((proposicion) => (
                            <div key={proposicion.id} className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="mb-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {proposicion.numeroOrden}. {proposicion.titulo}
                                        </h2>
                                        {proposicion.yaVoto && (
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                ✓ VOTADO
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600">{proposicion.descripcion}</p>
                                </div>

                                {proposicion.yaVoto ? (
                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                        <p className="text-green-800 font-medium">
                                            Ya emitiste tu voto en esta pregunta
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {proposicion.opciones.map((opcion) => (
                                            <Button
                                                key={opcion.id}
                                                onClick={() => emitirVoto(proposicion.id, opcion.id)}
                                                disabled={votando === proposicion.id}
                                                variant="outline"
                                                className="w-full h-auto py-4 text-lg justify-start hover:bg-purple-50 hover:border-purple-300"
                                            >
                                                {opcion.texto}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Info del votante */}
                <div className="mt-8 bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Tu coeficiente de votación:</span>
                        <span className="font-semibold text-gray-900">
                            {Number(votante?.coeficienteTotal).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </main>
        </div>
    )
}