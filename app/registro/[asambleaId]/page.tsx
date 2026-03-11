//app/registro/[asambleaId]/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Users, Building, MapPin, Percent, Monitor, Home, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface PropietarioConPoderes {
  id: string
  nombreCompleto: string
  cedula: string
  torreManzana: string
  aptoCasa: string
  coeficiente: number
  esPropietario: boolean
  poderesOtorgados: Array<{
    id: string
    otorgante: {
      id: string
      nombreCompleto: string
      cedula: string
      torreManzana: string
      aptoCasa: string
      coeficiente: number
    }
  }>
  coeficienteTotal: number
  tienePoderes: boolean
  cantidadUnidades: number
  unidades: string[]
}

interface AsambleaInfo {
  id: string
  estado: string
  modalidad: 'presencial' | 'virtual' | 'mixta' | 'hibrida'
  tipo: string
  conjunto: { id: string, nombre: string }
}

const CONJUNTO_TORRE_APTO_ID = '4231a601-6721-46e0-b8c4-5f3435adfc28'
const CONJUNTO_TORRE_APTO_NOMBRE = 'EDIFICIO INFINITY'
type ModoEntrada = 'residente' | 'apoderado_externo' | null

export default function RegistroPage({ params, }: { params: Promise<{ asambleaId: string }> }) {
  const { asambleaId } = use(params)
  const [cedula, setCedula] = useState('')
  const [propietario, setPropietario] = useState<PropietarioConPoderes | null>(null)
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial')
  const [loading, setLoading] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [error, setError] = useState('')
  const [asamblea, setAsamblea] = useState<AsambleaInfo | null>(null)
  const [cargandoAsamblea, setCargandoAsamblea] = useState(true)
  const [torre, setTorre] = useState('')
  const [apto, setApto] = useState('')
  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>(null)
  const router = useRouter()

  // Cargar datos de la asamblea al montar
  useEffect(() => {
    const fetchAsamblea = async () => {
      try {
        const res = await fetch(`/api/asambleas/${asambleaId}`)
        const data = await res.json()
        if (data.success) {
          setAsamblea(data.data)
          // Pre-seleccionar modalidad según la de la asamblea
          if (data.data.modalidad === 'virtual') {
            setModalidad('virtual')
          } else {
            setModalidad('presencial')
          }
        }
      } catch (e) {
        console.error('Error al cargar asamblea', e)
      } finally {
        setCargandoAsamblea(false)
      }
    }
    fetchAsamblea()
  }, [asambleaId])

  const esModoTorreApto = asamblea?.conjunto?.id === CONJUNTO_TORRE_APTO_ID ||
    asamblea?.conjunto?.nombre?.toUpperCase() === CONJUNTO_TORRE_APTO_NOMBRE

  const esHibrida = asamblea?.modalidad === 'hibrida' || asamblea?.modalidad === 'mixta'

  // Modalidad final a enviar al API: en híbrida el usuario elige; si no, es fija
  const getModalidadFinal = (): 'presencial' | 'virtual' => {
    if (!esHibrida) {
      return asamblea?.modalidad === 'virtual' ? 'virtual' : 'presencial'
    }
    return modalidad
  }

  const buscarPropietario = async () => {
    if (esModoTorreApto && modoEntrada === 'residente') {
      if (!torre.trim() || !apto.trim()) {
        setError('Ingresa la torre y el apartamento')
        return
      }
    } else {
      if (cedula.length < 6) {
        setError('Ingresa una cédula válida')
        return
      }
    }

    setLoading(true)
    setError('')

    let url: string
    try {

      if (esModoTorreApto && modoEntrada === 'residente') {
        url = `/api/propietarios/buscar?torre=${encodeURIComponent(torre)}&apto=${encodeURIComponent(apto)}&asambleaId=${asambleaId}`
      } else {
        url = `/api/propietarios/buscar?cedula=${cedula}&asambleaId=${asambleaId}`
      }
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setPropietario(data.data)
      } else {
        setError(data.error)
        setPropietario(null)
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistro = async () => {
    if (!propietario) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId,
          cedula: esModoTorreApto ? propietario.cedula : cedula,
          nombreCompleto: propietario.nombreCompleto,
          modalidadAsistencia: getModalidadFinal(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (esModoTorreApto) {
          setRegistrado(true)
          sessionStorage.setItem('cedula_votante', propietario.cedula)
          router.push(`/votar/${asambleaId}`)
        }
        setRegistrado(true)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // Subtexto del resumen de coeficiente 

  const getResumenCoeficiente = (): string => {
    if (!propietario) return ''

    const { esPropietario, cantidadUnidades, poderesOtorgados } = propietario
    const numPoderes = poderesOtorgados.length

    if (!esPropietario) {
      // Apoderado externo: solo tiene poderes
      return `(${numPoderes} ${numPoderes === 1 ? 'poder' : 'poderes'} representados)`
    }

    if (cantidadUnidades > 1 && numPoderes > 0) {
      return `(${cantidadUnidades} unidades + ${numPoderes} ${numPoderes === 1 ? 'poder' : 'poderes'})`
    }
    if (cantidadUnidades > 1) {
      return `(${cantidadUnidades} unidades propias)`
    }
    if (numPoderes > 0) {
      return `(1 propio + ${numPoderes} ${numPoderes === 1 ? 'poder' : 'poderes'})`
    }
    return '(solo coeficiente propio)'
  }

  if (cargandoAsamblea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!asamblea || asamblea.estado === 'finalizada') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Asamblea Finalizada
          </h2>
          <p className="text-gray-600">
            Esta asamblea ya ha concluido. No es posible registrar nuevos participantes
            ni realizar votaciones.
          </p>
        </div>
      </div>
    )
  }

  if (asamblea.estado === 'borrador') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Asamblea no iniciada
          </h2>
          <p className="text-gray-600">
            La asamblea aún no ha comenzado. Vuelve cuando el administrador la active.
          </p>
        </div>
      </div>
    )
  }

  // Pantalla de éxito

  if (registrado && propietario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Registro Exitoso!</h1>

          <p className="text-gray-600 mb-1">{propietario.nombreCompleto}</p>

          {/* Badge diferenciado para externo vs propietario */}
          {propietario.esPropietario ? (
            <p className="text-sm text-gray-500 mb-4">{propietario.aptoCasa}</p>
          ) : (
            <div className="flex justify-center mb-4">
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">
                Apoderado externo
              </Badge>
            </div>
          )}

          <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
            <p className="text-sm text-green-700 mb-1">Coeficiente registrado</p>
            <p className="text-3xl font-bold text-green-800">
              {Number(propietario.coeficienteTotal).toFixed(2)}%
            </p>
            {propietario.tienePoderes && (
              <p className="text-xs text-green-600 mt-1">
                Representa {propietario.poderesOtorgados.length}{' '}
                {propietario.poderesOtorgados.length === 1 ? 'poder' : 'poderes'}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push(`/votar/${asambleaId}`)}
              className="w-full"
            >
              Ir a Votar
            </Button>
            <Button
              onClick={() => {
                setRegistrado(false)
                setCedula('')
                setPropietario(null)
              }}
              variant="outline"
              className="w-full"
            >
              Registrar Otro Votante
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Registro de Asistencia
            </h1>
            <p className="text-gray-600">
              {esModoTorreApto ? 'Ingresa tu torre y apartamento para registrarte' : 'Ingresa tu cédula para registrarte'}</p>
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

          {/* Formulario de búsqueda */}
          {!propietario && (
            <div className="space-y-4">
              {/* Selector de modo — solo en EDIFICIO INFINITY */}
              {esModoTorreApto && modoEntrada === null && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 text-center">
                    ¿Cómo deseas registrarte?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModoEntrada('residente')}
                      className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors text-center"
                    >
                      <Home className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">Soy residente</p>
                      <p className="text-xs text-gray-400 mt-1">Buscar por Torre y Apto</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoEntrada('apoderado_externo')}
                      className="p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors text-center"
                    >
                      <UserX className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">Soy apoderado</p>
                      <p className="text-xs text-gray-400 mt-1">Tengo poder de un residente</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario según modo seleccionado */}
              {(!esModoTorreApto || modoEntrada !== null) && (
                <>
                  {esModoTorreApto && modoEntrada === 'residente' ? (
                    /* Torre + Apto */
                    <>
                      <button
                        type="button"
                        onClick={() => { setModoEntrada(null); setError('') }}
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
                          onKeyDown={(e) => { if (e.key === 'Enter') buscarPropietario() }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Apartamento</label>
                        <Input
                          value={apto}
                          onChange={(e) => setApto(e.target.value)}
                          placeholder="Ej: 101"
                          onKeyDown={(e) => { if (e.key === 'Enter') buscarPropietario() }}
                        />
                      </div>
                    </>
                  ) : (
                    /* Cédula — conjuntos normales O apoderado externo */
                    <>
                      {esModoTorreApto && (
                        <button
                          type="button"
                          onClick={() => { setModoEntrada(null); setError('') }}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          ← Volver
                        </button>
                      )}
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
                          onKeyDown={(e) => { if (e.key === 'Enter') buscarPropietario() }}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={buscarPropietario}
                    disabled={
                      loading || (
                        esModoTorreApto && modoEntrada === 'residente'
                          ? (!torre.trim() || !apto.trim())
                          : cedula.length < 6
                      )
                    }
                    className="w-full"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Tarjeta de datos encontrados */}
          {propietario && (
            <div className="space-y-6">
              <div className={`rounded-lg p-4 border-2 ${propietario.esPropietario
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-amber-50 border-amber-200'
                }`}>

                {/* Título de la tarjeta */}
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${propietario.esPropietario ? 'text-indigo-900' : 'text-amber-900'
                  }`}>
                  {propietario.esPropietario
                    ? <Users className="h-5 w-5" />
                    : <UserX className="h-5 w-5" />
                  }
                  {propietario.esPropietario ? 'Propietario encontrado' : 'Apoderado externo'}

                  {/* Badge visible de tipo */}
                  {!propietario.esPropietario && (
                    <Badge className="ml-auto bg-amber-200 text-amber-900 text-xs border-0">
                      No propietario
                    </Badge>
                  )}
                </h3>

                <div className="space-y-3 text-sm">

                  {/* Datos personales */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{propietario.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">CC: {propietario.cedula}</p>
                      </div>
                    </div>

                    {/* Unidad: solo si es propietario */}
                    {propietario.esPropietario && (
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          {propietario.cantidadUnidades === 1 ? (
                            <p className="text-gray-700">{propietario.aptoCasa}</p>
                          ) : (
                            <div>
                              <p className="text-gray-700 font-medium mb-1">
                                {propietario.cantidadUnidades} unidades:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {propietario.unidades.map((unidad, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {unidad}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Aviso visible cuando es externo */}
                    {!propietario.esPropietario && (
                      <div className="flex items-start gap-2 mt-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          Esta persona no es propietaria del conjunto, pero tiene poderes vigentes para esta asamblea.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coeficientes */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    {/* Coeficiente propio (solo si es propietario) */}
                    {propietario.esPropietario && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            Coeficiente{propietario.cantidadUnidades > 1 ? ` (${propietario.cantidadUnidades} unidades)` : ' propio'}:
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {Number(propietario.coeficiente).toFixed(2)}%
                        </span>
                      </div>
                    )}

                    {/* Coeficiente por poderes */}
                    {propietario.poderesOtorgados.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className={`text-gray-700 ${propietario.esPropietario ? 'pl-6' : 'flex items-center gap-2'}`}>
                          {!propietario.esPropietario && <Percent className="h-4 w-4 text-gray-500" />}
                          Coef. por poderes:
                        </span>
                        <span className="font-medium text-gray-900">
                          {propietario.esPropietario
                            ? (Number(propietario.coeficienteTotal) - Number(propietario.coeficiente)).toFixed(2)
                            : Number(propietario.coeficienteTotal).toFixed(2)
                          }%
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    {(propietario.poderesOtorgados.length > 0 || propietario.cantidadUnidades > 1) && (
                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Coeficiente total:</span>
                        <Badge
                          variant="default"
                          className={`text-base ${propietario.esPropietario ? 'bg-indigo-600' : 'bg-amber-600'}`}
                        >
                          {Number(propietario.coeficienteTotal).toFixed(2)}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Detalle de poderes */}
                  {propietario.poderesOtorgados.length > 0 && (
                    <div className={`rounded-lg p-3 border ${propietario.esPropietario
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-100 border-amber-300'
                      }`}>
                      <p className={`font-medium mb-2 flex items-center gap-2 ${propietario.esPropietario ? 'text-blue-900' : 'text-amber-900'
                        }`}>
                        <Users className="h-4 w-4" />
                        Representa a {propietario.poderesOtorgados.length}{' '}
                        {propietario.poderesOtorgados.length === 1 ? 'propietario' : 'propietarios'}:
                      </p>
                      <div className="space-y-2">
                        {propietario.poderesOtorgados.map((poder) => (
                          <div key={poder.id} className="bg-white rounded p-2 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {poder.otorgante.nombreCompleto}
                                </p>
                                <p className="text-gray-500">CC: {poder.otorgante.cedula}</p>
                                <p className="text-gray-500">
                                  {poder.otorgante.torreManzana} - {poder.otorgante.aptoCasa}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {Number(poder.otorgante.coeficiente).toFixed(2)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumen de voto */}
                  <div className={`rounded-lg p-3 text-center border ${propietario.esPropietario
                    ? 'bg-indigo-100 border-indigo-300'
                    : 'bg-amber-100 border-amber-300'
                    }`}>
                    <p className={`text-xs mb-1 ${propietario.esPropietario ? 'text-indigo-700' : 'text-amber-700'
                      }`}>
                      Votarás con un total de:
                    </p>
                    <p className={`text-2xl font-bold ${propietario.esPropietario ? 'text-indigo-900' : 'text-amber-900'
                      }`}>
                      {Number(propietario.coeficienteTotal).toFixed(2)}%
                    </p>
                    <p className={`text-xs mt-1 ${propietario.esPropietario ? 'text-indigo-600' : 'text-amber-700'
                      }`}>
                      {getResumenCoeficiente()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector de modalidad (solo en híbrida) */}
              {esHibrida && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cómo estás participando?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalidad('presencial')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${modalidad === 'presencial'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      Presencial
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalidad('virtual')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${modalidad === 'virtual'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      Virtual
                    </button>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="space-y-3">
                <Button
                  onClick={handleRegistro}
                  disabled={loading}
                  className={`w-full ${!propietario.esPropietario ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                >
                  {loading ? 'Registrando...' : 'Confirmar Registro'}
                </Button>
                <Button
                  onClick={() => {
                    setPropietario(null)
                    setRegistrado(false)
                    setCedula('')
                    setError('')
                    setApto('')
                    setTorre('')
                    setModoEntrada(null)
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  Buscar otro propietario
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}