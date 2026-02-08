'use client'

import { use, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Users, Building, MapPin, Percent } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface PropietarioConPoderes {
  id: string
  nombreCompleto: string
  cedula: string
  torreManzana: string
  aptoCasa: string
  coeficiente: number
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
}

export default function RegistroPage({
  params,
}: {
  params: Promise<{ asambleaId: string }>
}) {
  const { asambleaId } = use(params)
  const [cedula, setCedula] = useState('')
  const [propietario, setPropietario] = useState<PropietarioConPoderes | null>(null)
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial')
  const [loading, setLoading] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const buscarPropietario = async () => {
    if (cedula.length < 6) {
      setError('Ingresa una cédula válida')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/propietarios/buscar?cedula=${cedula}&asambleaId=${asambleaId}`)
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
          cedula,
          nombreCompleto: propietario.nombreCompleto,
          modalidadAsistencia: modalidad,
        }),
      })

      const data = await response.json()

      if (data.success) {
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

  // Pantalla de éxito
  if (registrado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Registro Exitoso!
          </h1>
          <p className="text-gray-600 mb-6">
            {propietario?.nombreCompleto}
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              Ya puedes participar en las votaciones de la asamblea
            </p>
            {propietario?.tienePoderes && (
              <p className="text-xs text-green-700 mt-2">
                Votarás con un coeficiente total de {Number(propietario.coeficienteTotal).toFixed(1)}%
                ({propietario.poderesOtorgados.length} {propietario.poderesOtorgados.length === 1 ? 'poder' : 'poderes'})
              </p>
            )}
          </div>

          {/* BOTONES ACTUALIZADOS */}
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
              Ingresa tu cédula para registrarte
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Formulario de Cédula */}
          {!propietario && (
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      buscarPropietario()
                    }
                  }}
                />
              </div>

              <Button
                onClick={buscarPropietario}
                disabled={loading || cedula.length < 6}
                className="w-full"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          )}

          {/* Datos del Propietario */}
          {propietario && (
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Datos Encontrados
                </h3>
                <div className="space-y-3 text-sm">
                  {/* Datos Personales */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {propietario.nombreCompleto}
                        </p>
                        <p className="text-xs text-gray-500">
                          CC: {propietario.cedula}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-700">
                          {propietario.torreManzana} - {propietario.aptoCasa}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Coeficientes */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">Coeficiente propio:</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {Number(propietario.coeficiente).toFixed(1)}%
                      </span>
                    </div>

                    {propietario.tienePoderes && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 pl-6">Coef. por poderes:</span>
                          <span className="font-medium text-gray-900">
                            {(Number(propietario.coeficienteTotal) - Number(propietario.coeficiente)).toFixed(1)}%
                          </span>
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Coeficiente total:</span>
                          <Badge variant="default" className="text-base">
                            {Number(propietario.coeficienteTotal).toFixed(1)}%
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Detalle de Poderes */}
                  {propietario.tienePoderes && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Representa a {propietario.poderesOtorgados.length}{' '}
                        {propietario.poderesOtorgados.length === 1 ? 'propietario' : 'propietarios'}:
                      </p>
                      <div className="space-y-2">
                        {propietario.poderesOtorgados.map((poder) => (
                          <div
                            key={poder.id}
                            className="bg-white rounded p-2 text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {poder.otorgante.nombreCompleto}
                                </p>
                                <p className="text-gray-500">
                                  CC: {poder.otorgante.cedula}
                                </p>
                                <p className="text-gray-500">
                                  {poder.otorgante.torreManzana} - {poder.otorgante.aptoCasa}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {Number(poder.otorgante.coeficiente).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumen de Voto */}
                  <div className="bg-indigo-100 rounded-lg p-3 text-center border border-indigo-300">
                    <p className="text-xs text-indigo-700 mb-1">
                      Votarás con un total de:
                    </p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {Number(propietario.coeficienteTotal).toFixed(1)}%
                    </p>
                    <p className="text-xs text-indigo-600">
                      {propietario.tienePoderes
                        ? `(1 propio + ${propietario.poderesOtorgados.length} ${propietario.poderesOtorgados.length === 1 ? 'poder' : 'poderes'
                        })`
                        : '(solo coeficiente propio)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modalidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidad de Asistencia
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModalidad('presencial')}
                    className={`p-4 rounded-lg border-2 transition-colors ${modalidad === 'presencial'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Building
                      className={`h-6 w-6 mx-auto mb-2 ${modalidad === 'presencial' ? 'text-indigo-600' : 'text-gray-400'
                        }`}
                    />
                    <p
                      className={`text-sm font-medium ${modalidad === 'presencial' ? 'text-indigo-900' : 'text-gray-700'
                        }`}
                    >
                      Presencial
                    </p>
                  </button>
                  <button
                    onClick={() => setModalidad('virtual')}
                    className={`p-4 rounded-lg border-2 transition-colors ${modalidad === 'virtual'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Users
                      className={`h-6 w-6 mx-auto mb-2 ${modalidad === 'virtual' ? 'text-indigo-600' : 'text-gray-400'
                        }`}
                    />
                    <p
                      className={`text-sm font-medium ${modalidad === 'virtual' ? 'text-indigo-900' : 'text-gray-700'
                        }`}
                    >
                      Virtual
                    </p>
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setPropietario(null)
                    setCedula('')
                    setError('')
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRegistro}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Registrando...' : 'Confirmar Registro'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}