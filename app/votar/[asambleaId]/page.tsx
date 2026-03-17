'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Vote, LogOut, Video, ExternalLink, Building, MapPin, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { useVotacionPolling } from '@/components/hooks/use-votacion-polling'

// Constantes Infinity
const CONJUNTO_INFINITY_ID = '4231a601-6721-46e0-b8c4-5f3435adfc28'

type ModoLoginInfinity = null | 'residente' | 'apoderado_externo'

// Tipos
interface Votante {
    id: string
    nombreCompleto: string
    coeficienteTotal: number
    confirmoAsistencia: boolean
}

interface AsambleaInfo {
    id: string
    estado: string
    modalidad: string
    conjuntoId: string
}

// Estado de bloqueo de voto
interface EstadoBloqueo {
    nombreCompleto: string
    motivo: string
}

export default function VotacionPage({
    params,
}: {
    params: Promise<{ asambleaId: string }>
}) {
    const { asambleaId } = use(params)

    // Estado general
    const [inicializando, setInicializando] = useState(true)
    const [asamblea, setAsamblea] = useState<AsambleaInfo | null>(null)
    const [autenticado, setAutenticado] = useState(false)
    const [votante, setVotante] = useState<Votante | null>(null)
    const [bloqueado, setBloqueado] = useState<EstadoBloqueo | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [votando, setVotando] = useState<string | null>(null)
    const [mostrarAlertaConfirmacion, setMostrarAlertaConfirmacion] = useState(false)
    const [confirmando, setConfirmando] = useState(false)

    // Estado login normal (cédula)
    const [cedula, setCedula] = useState('')
    const [cedulaActiva, setCedulaActiva] = useState<string | null>(null)

    // Estado login Infinity
    const [modoLoginInfinity, setModoLoginInfinity] = useState<ModoLoginInfinity>(null)
    const [torre, setTorre] = useState('')
    const [apto, setApto] = useState('')
    const [cedulaApoderado, setCedulaApoderado] = useState('')

    // Derivados
    const esInfinity = asamblea?.conjuntoId === CONJUNTO_INFINITY_ID

    // POLLING
    const { estado, refrescarAhora } = useVotacionPolling({
        asambleaId,
        cedula: cedulaActiva,
        activo: autenticado,
        intervalo: 5000,
    })

    // Detectar activación de confirmación de asistencia via polling
    useEffect(() => {
        if (!estado || !votante) return
        if (estado.confirmacionActivada && !votante.confirmoAsistencia) {
            setMostrarAlertaConfirmacion(true)
        }
        if (!estado.confirmacionActivada || estado.asambleaEstado === 'finalizada') {
            setMostrarAlertaConfirmacion(false)
        }
    }, [estado?.confirmacionActivada, estado?.asambleaEstado, votante])

    // Cargar datos básicos de la asamblea
    useEffect(() => {
        const cargarAsamblea = async () => {
            try {
                const res = await fetch(`/api/asambleas/${asambleaId}`)
                const data = await res.json()
                if (data.success) {
                    setAsamblea({
                        id: data.data.id,
                        estado: data.data.estado,
                        modalidad: data.data.modalidad,
                        conjuntoId: data.data.conjuntoId ?? data.data.conjunto?.id,
                    })
                }
            } catch {
                // Si falla, continuar sin modo Infinity (flujo normal)
            }
        }
        cargarAsamblea()
    }, [asambleaId])

    // Autenticar con cédula (flujo normal y apoderado externo Infinity)
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
                setCedulaActiva(cedulaValue)
                setVotante(data.data.votante)
                setAutenticado(true)
                sessionStorage.setItem('cedula_votante', cedulaValue)

                if (data.data.confirmacionActivada && !data.data.votante.confirmoAsistencia) {
                    setMostrarAlertaConfirmacion(true)
                }
            } else if (data.error === 'SIN_DERECHO_AL_VOTO') {
                // Propietario en mora: registrado pero sin derecho al voto
                setBloqueado({
                    nombreCompleto: data.data.nombreCompleto,
                    motivo: data.data.motivo,
                })
                sessionStorage.removeItem('cedula_votante')
            } else {
                setError(data.error || 'Cédula no encontrada en esta asamblea')
                sessionStorage.removeItem('cedula_votante')
            }
        } catch {
            setError('Error de conexión. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }, [asambleaId])

    // Autenticar con Torre+Apto (Infinity residente)
    const autenticarConTorreApto = async () => {
        if (!torre.trim() || !apto.trim()) {
            setError('Ingresa la torre y el apartamento')
            return
        }
        setLoading(true)
        setError('')

        try {
            // 1. Buscar propietario por torre+apto para obtener su cédula
            const resBuscar = await fetch(
                `/api/propietarios/buscar?torre=${encodeURIComponent(torre)}&apto=${encodeURIComponent(apto)}&asambleaId=${asambleaId}`
            )
            const dataBuscar = await resBuscar.json()

            if (!dataBuscar.success) {
                setError(dataBuscar.error || 'No se encontró propietario para esa torre y apartamento')
                setLoading(false)
                return
            }

            // 2. Usar la cédula del propietario encontrado para autenticar en votación
            const cedulaEncontrada: string = dataBuscar.data.cedula
            await autenticarConCedula(cedulaEncontrada)
        } catch {
            setError('Error de conexión. Intenta nuevamente.')
            setLoading(false)
        }
    }

    // Restaurar sesión al montar
    useEffect(() => {
        const restaurarSesion = async () => {
            // Esperamos a tener los datos de asamblea antes de restaurar sesión
            // para saber si es Infinity o no (el cargarAsamblea ya corrió antes)
            const cedulaGuardada = sessionStorage.getItem('cedula_votante')
            if (cedulaGuardada) {
                await autenticarConCedula(cedulaGuardada)
            }
            setInicializando(false)
        }

        // Solo restaurar sesión cuando ya tenemos info de la asamblea
        if (asamblea !== null) {
            restaurarSesion()
        }
    }, [asamblea, autenticarConCedula])

    // Cerrar sesión
    const cerrarSesion = () => {
        setCedulaActiva(null)
        sessionStorage.removeItem('cedula_votante')
        setAutenticado(false)
        setCedula('')
        setVotante(null)
        setBloqueado(null)
        setMostrarAlertaConfirmacion(false)
        setTorre('')
        setApto('')
        setCedulaApoderado('')
        setModoLoginInfinity(null)
    }

    // Confirmar asistencia
    const confirmarAsistencia = async () => {
        if (!votante) return
        setConfirmando(true)

        try {
            const response = await fetch('/api/confirmacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asambleaId, votanteId: votante?.id }),
            })
            const data = await response.json()

            if (data.success) {
                setVotante(prev => prev ? { ...prev, confirmoAsistencia: true } : null)
                setMostrarAlertaConfirmacion(false)
                toast.success('Asistencia confirmada exitosamente')
            } else {
                toast.error('Error al confirmar asistencia: ' + data.error)
            }
        } catch {
            toast.error('Error al confirmar asistencia')
        } finally {
            setConfirmando(false)
        }
    }

    // Emitir voto
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
                    cedula,
                }),
            })
            const data = await response.json()

            if (data.success) {
                toast.success('¡Voto registrado exitosamente!')
                refrescarAhora()
            } else {
                toast.error('Error al votar: ' + (data.error || 'Error desconocido'))
                setError(data.error)
            }
        } catch {
            toast.error('Error de conexión al votar')
            setError('Error al registrar voto')
        } finally {
            setVotando(null)
        }
    }

    // ── RENDER ──

    // Cargando asamblea o sesión
    if (inicializando || asamblea === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="text-gray-600">Cargando sesión…</span>
            </div>
        )
    }

    // Pantalla "voz sin voto" — propietario en mora
    if (bloqueado) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                        <ShieldOff className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Voz sin voto</h2>
                    <p className="text-gray-500 text-sm mb-4">{bloqueado.nombreCompleto}</p>
                    <p className="text-gray-600 mb-5">
                        Estás registrado como asistente a esta asamblea, pero{' '}
                        <strong>no tienes derecho al voto</strong>.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        {bloqueado.motivo}
                    </div>
                    <button
                        onClick={cerrarSesion}
                        className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                        Volver
                    </button>
                </div>
            </div>
        )
    }

    // ── Pantalla de Login ──
    if (!autenticado) {

        // Login INFINITY
        if (esInfinity) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                                <Vote className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Votación</h1>
                            <p className="text-gray-500 text-sm">Edificio Infinity</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Selector de modo */}
                        {modoLoginInfinity === null && (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700 text-center mb-4">
                                    ¿Cómo deseas ingresar?
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setModoLoginInfinity('residente'); setError('') }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <Building className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Soy residente / propietario</p>
                                        <p className="text-xs text-gray-500">Ingreso con torre y apartamento</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setModoLoginInfinity('apoderado_externo'); setError('') }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Soy apoderado externo</p>
                                        <p className="text-xs text-gray-500">Ingreso con mi número de cédula</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Modo residente: Torre + Apto */}
                        {modoLoginInfinity === 'residente' && (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => { setModoLoginInfinity(null); setError(''); setTorre(''); setApto('') }}
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    ← Volver
                                </button>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Torre</label>
                                    <Input
                                        value={torre}
                                        onChange={(e) => setTorre(e.target.value)}
                                        placeholder="Ej: Torre A"
                                        onKeyDown={(e) => { if (e.key === 'Enter') autenticarConTorreApto() }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Apartamento</label>
                                    <Input
                                        value={apto}
                                        onChange={(e) => setApto(e.target.value)}
                                        placeholder="Ej: 101"
                                        onKeyDown={(e) => { if (e.key === 'Enter') autenticarConTorreApto() }}
                                    />
                                </div>
                                <Button
                                    onClick={autenticarConTorreApto}
                                    disabled={loading || !torre.trim() || !apto.trim()}
                                    className="w-full"
                                >
                                    {loading ? 'Verificando...' : 'Ingresar'}
                                </Button>
                            </div>
                        )}

                        {/* Modo apoderado externo: Cédula */}
                        {modoLoginInfinity === 'apoderado_externo' && (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => { setModoLoginInfinity(null); setError(''); setCedulaApoderado('') }}
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    ← Volver
                                </button>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Número de Cédula
                                    </label>
                                    <Input
                                        type="text"
                                        value={cedulaApoderado}
                                        onChange={(e) => setCedulaApoderado(e.target.value.replace(/\D/g, ''))}
                                        placeholder="1234567890"
                                        maxLength={12}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') autenticarConCedula(cedulaApoderado)
                                        }}
                                    />
                                </div>
                                <Button
                                    onClick={() => autenticarConCedula(cedulaApoderado)}
                                    disabled={loading || cedulaApoderado.length < 6}
                                    className="w-full"
                                >
                                    {loading ? 'Verificando...' : 'Ingresar'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        // Login NORMAL (todos los demás conjuntos)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                            <Vote className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Votación</h1>
                        <p className="text-gray-600">Ingresa tu cédula para votar</p>
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
                                onKeyDown={(e) => { if (e.key === 'Enter') autenticarConCedula(cedula) }}
                            />
                        </div>
                        <Button
                            onClick={() => autenticarConCedula(cedula)}
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

    // ── Panel de Votación (autenticado) ──
    const proposiciones = estado?.proposiciones ?? []
    const esVirtualOHibrida = (estado?.modalidad ?? '') === 'virtual' || (estado?.modalidad ?? '') === 'hibrida'
    const mostrarZoom = esVirtualOHibrida && estado?.linkZoom

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">

            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Panel de Votación</h1>
                            <p className="text-sm text-gray-600">{votante?.nombreCompleto}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={cerrarSesion}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            {/* Banner Zoom */}
            {mostrarZoom && (
                <div className="bg-blue-600 border-b-4 border-blue-700">
                    <div className="max-w-4xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-2">
                                    <Video className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm">
                                        Asamblea {estado?.modalidad === 'hibrida' ? 'Híbrida' : 'Virtual'}
                                    </p>
                                    <p className="text-blue-100 text-xs">Únete a la sesión en línea para participar</p>
                                </div>
                            </div>
                            <a
                                href={estado?.linkZoom!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors flex-shrink-0"
                            >
                                Unirse <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerta Confirmación de Asistencia */}
            {mostrarAlertaConfirmacion && (
                <div className="bg-amber-50 border-b-2 border-amber-300">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-amber-800">
                                    El administrador solicita que confirmes tu asistencia para continuar participando.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={confirmarAsistencia}
                                disabled={confirmando}
                                className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
                            >
                                {confirmando ? 'Confirmando...' : 'Confirmar asistencia'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenido principal */}
            <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

                {/* Error global */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Coeficiente del votante */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Tu coeficiente total</p>
                    <p className="text-2xl font-bold text-indigo-700">
                        {votante?.coeficienteTotal?.toFixed(4)}%
                    </p>
                </div>

                {/* Proposiciones */}
                {proposiciones.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <Vote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay votaciones activas en este momento</p>
                        <p className="text-gray-400 text-sm mt-1">El administrador abrirá las votaciones durante la asamblea</p>
                    </div>
                ) : (
                    proposiciones.map((proposicion: any) => {
                        const yaVoto = proposicion.yaVoto

                        return (
                            <div
                                key={proposicion.id}
                                className="bg-white rounded-xl border border-indigo-300 shadow-md p-6 space-y-4"
                            >
                                {/* Cabecera proposición */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                                            {proposicion.tipoPregunta === 'binaria' ? 'Votación' : 'Elección'}
                                        </span>
                                        <h2 className="text-lg font-bold text-gray-900 mt-1">{proposicion.titulo}</h2>
                                        {proposicion.descripcion && (
                                            <p className="text-sm text-gray-500 mt-1">{proposicion.descripcion}</p>
                                        )}
                                    </div>
                                    <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                                        Activa
                                    </span>
                                </div>

                                {/* Voto ya emitido */}
                                {yaVoto ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                        <p className="text-green-700 font-semibold text-sm">✓ Voto registrado</p>
                                        <p className="text-green-600 text-xs mt-1">
                                            Tu voto ha sido contabilizado correctamente
                                        </p>
                                    </div>
                                ) : (
                                    /* Opciones de voto */
                                    <div className="grid gap-2">
                                        {proposicion.opciones?.map((opcion: any) => (
                                            <button
                                                key={opcion.id}
                                                onClick={() => emitirVoto(proposicion.id, opcion.id)}
                                                disabled={!!votando}
                                                className={`w-full py-3 px-4 rounded-lg border-2 font-medium text-sm transition-all
                                                    ${votando === proposicion.id
                                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-wait'
                                                        : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 active:scale-[0.98]'
                                                    }`}
                                            >
                                                {votando === proposicion.id ? 'Registrando...' : opcion.texto}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </main>
        </div>
    )
}