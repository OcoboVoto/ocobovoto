'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Building2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { Footer } from '@/components/layouts/Footer'

interface ConjuntoOpcion {
  id: string
  nombre: string
  nit: string
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorEmail, setErrorEmail] = useState('')
  const [errorPassword, setErrorPassword] = useState('')

  const [conjuntos, setConjuntos] = useState<ConjuntoOpcion[] | null>(null)
  const [conjuntoSeleccionado, setConjuntoSeleccionado] = useState('')
  // Guardamos email/password en memoria para reusarlos al seleccionar conjunto
  const [credencialesGuardadas, setCredencialesGuardadas] = useState<{ email: string; password: string } | null>(null)

  // Al montar: detectar si viene del flujo "cambiar conjunto"
  useEffect(() => {
    const cookies = document.cookie.split('; ')
    const selectorCookie = cookies.find(c => c.startsWith('admin-selector='))

    if (selectorCookie) {
      try {
        const data = JSON.parse(decodeURIComponent(selectorCookie.split('=').slice(1).join('=')))
        // Limpiar la cookie temporal
        document.cookie = 'admin-selector=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        // Pre-cargar email para reusarlo en el submit del selector
        setEmail(data.email)
        // Mostrar selector directamente con los conjuntos ya disponibles
        setConjuntos(data.conjuntos)
      } catch {
        // si falla el parse, flujo normal
      }
    }
  }, [])

  const validarCampos = () => {
    let valido = true
    setErrorEmail('')
    setErrorPassword('')
    if (!email) { setErrorEmail('El email es requerido'); valido = false }
    if (!password) { setErrorPassword('La contraseña es requerida'); valido = false }
    return valido
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validarCampos()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin/dashboard')
        router.refresh()
        return
      }

      if (data.data?.requiresConjuntoSelection) {
        // Guardar credenciales en memoria para usarlas al confirmar conjunto
        setCredencialesGuardadas({ email, password })
        setConjuntos(data.data.conjuntos)
        return
      }

      setError(data.error || 'Credenciales inválidas')
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionarConjunto = async () => {
    if (!conjuntoSeleccionado) return

    setLoading(true)
    setError('')

    // Si viene del flujo "cambiar conjunto", el email está en estado
    // pero no tenemos la password — necesitamos pedirla via API con el adminId
    // que ya está en la cookie temporal. Usamos un endpoint especial:
    const esCambioConjunto = !credencialesGuardadas

    try {
      let response: Response

      if (esCambioConjunto) {
        // Flujo cambio de conjunto: autenticar solo con conjuntoId (ya validado antes)
        response = await fetch('/api/auth/seleccionar-conjunto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conjuntoId: conjuntoSeleccionado }),
        })
      } else {
        // Flujo login normal con múltiples conjuntos
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credencialesGuardadas.email,
            password: credencialesGuardadas.password,
            conjuntoId: conjuntoSeleccionado,
          }),
        })
      }

      const data = await response.json()

      if (data.success) {
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Error al seleccionar conjunto')
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative scale-[2.8]">
                <Image src="/icon_pink.png" alt="Logo" width={100} height={48} className="object-contain" priority />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {conjuntos ? 'Selecciona tu Conjunto' : 'Iniciar Sesión'}
            </h1>
            <p className="text-gray-500 text-sm">
              {conjuntos
                ? 'Elige el conjunto que deseas administrar'
                : 'Accede al panel de administración'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* PASO 2: Selector de conjunto */}
          {conjuntos ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {conjuntos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConjuntoSeleccionado(c.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${conjuntoSeleccionado === c.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-400'
                      }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${conjuntoSeleccionado === c.id ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <Building2 className={`h-5 w-5 ${conjuntoSeleccionado === c.id ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{c.nombre}</p>
                      <p className="text-xs text-slate-500">NIT: {c.nit}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSeleccionarConjunto}
                className="w-full bg-slate-900 hover:bg-slate-800"
                disabled={!conjuntoSeleccionado || loading}
              >
                {loading ? 'Ingresando...' : 'Ingresar al conjunto'}
              </Button>

              {/* Solo mostrar "volver" en flujo normal, no en cambio de conjunto */}
              {credencialesGuardadas && (
                <button
                  type="button"
                  onClick={() => { setConjuntos(null); setConjuntoSeleccionado(''); setError(''); setCredencialesGuardadas(null) }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al login
                </button>
              )}
            </div>
          ) : (
            /* PASO 1: Credenciales */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errorEmail ? 'border-red-500' : ''}
                  placeholder="admin@conjunto.com"
                  required
                  autoComplete="email"
                />
                {errorEmail && <p className="text-sm text-red-600 mt-1">{errorEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errorPassword ? 'border-red-500' : ''}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                {errorPassword && <p className="text-sm text-red-600 mt-1">{errorPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Footer role='ADMIN' />
          </div>
        </div>
      </div>
    </div>
  )
}