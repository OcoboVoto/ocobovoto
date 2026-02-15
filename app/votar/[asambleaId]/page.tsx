'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Vote, LogOut, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/createBrowserClient'

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

    // ── Helpers ──────────────────────────────────────────────
    const refrescarProposiciones = async (cedulaValue: string) => {
        try {
            const response = await fetch(`/api/votacion/${asambleaId}?cedula=${cedulaValue}`)
            const data = await response.json()
            if (data.success) {
                setProposiciones(data.data.proposiciones)
            }
        } catch (err) {
            console.error('[Realtime] Error refrescando proposiciones:', err)
        }
    }

    const autenticar = () => autenticarConCedula(cedula)

    const autenticarConCedula = async (cedulaValue: string) => {
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

                // Guardar cédula en sessionStorage para no pedirla de nuevo
                sessionStorage.setItem('cedula_votante', cedulaValue)
            } else {
                setError(data.error)
            }
        } catch (error) {
            console.error('Error restaurando sesión', error)
            setError('Error de conexión')
            setAutenticado(false)
        } finally {
            setLoading(false)
        }
    }

    const emitirVoto = async (proposicionId: string, opcionId: string) => {
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
            } else {
                setError(data.error)
            }
        } catch (error) {
            setError('Error al registrar voto')
        } finally {
            setVotando(null)
        }
    }

    const cerrarSesion = () => {
        sessionStorage.removeItem('cedula_votante')
        setAutenticado(false)
        setCedula('')
        setVotante(null)
        setProposiciones([])
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

    // ── Auto-autenticar ─────────────────────────────────────
    useEffect(() => {
        const restaurarSesion = async () => {
            const cedulaGuardada = sessionStorage.getItem('cedula_votante')
            if (cedulaGuardada) {
                await autenticarConCedula(cedulaGuardada)
            }
            setInicializando(false)
        }
        restaurarSesion()
    }, [asambleaId])

// ── REALTIME: Canal único — SIN polling ─────────────────
useEffect(() => {
    if (!autenticado || !cedula || !votante) return

   // console.log('[Realtime] Suscribiendo canales votacion-', asambleaId)

    // Canal 1: postgres_changes para proposiciones y votos
    const channelDB = supabase
        .channel(`votacion-db-${asambleaId}-${votante.id}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'proposiciones',
            },
            async (payload) => {
                const newData = payload.new as any
                if (newData?.asamblea_id && newData.asamblea_id !== asambleaId) return
               // console.log('[Realtime] ✅ Proposición:', payload.eventType)
                await refrescarProposiciones(cedula)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'votos',
            },
            (payload) => {
                const newData = payload.new as any
                if (newData?.votante_id && newData.votante_id !== votante.id) return
               // console.log('[Realtime] ✅ Voto registrado:', newData?.proposicion_id)
                const proposicionId = newData?.proposicion_id
                if (proposicionId) {
                    setProposiciones(props =>
                        props.map(p =>
                            p.id === proposicionId ? { ...p, yaVoto: true } : p
                        )
                    )
                }
            }
        )
        .subscribe((status) => {
           // console.log('[Realtime] Canal DB:', status)
        })

    // Canal 2: BROADCAST para confirmación de asistencia (evita el 401 de asambleas)
    const channelBroadcast = supabase
        .channel(`asamblea-${asambleaId}`)
        .on('broadcast', { event: 'confirmacion' }, (payload) => {
           // console.log('[Realtime] ✅ Broadcast confirmación:', payload.payload)

            const data = payload.payload

            if (data.confirmacionActivada && !votante.confirmoAsistencia) {
                setMostrarAlertaConfirmacion(true)
            }

            if (!data.confirmacionActivada || data.confirmacionCerrada) {
                setMostrarAlertaConfirmacion(false)
            }
        })
        .subscribe((status) => {
           // console.log('[Realtime] Canal Broadcast:', status)
        })

    // Verificación inicial (solo 1 vez)
    const verificarConfirmacionInicial = async () => {
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

    verificarConfirmacionInicial()

    return () => {
       // console.log('[Realtime] Removiendo canales')
        supabase.removeChannel(channelDB)
        supabase.removeChannel(channelBroadcast)
    }
}, [autenticado, asambleaId, cedula, votante?.id])

    // ── RENDER ──────────────────────────────────────────────

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