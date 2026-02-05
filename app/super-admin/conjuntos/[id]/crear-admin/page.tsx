'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react'

interface Conjunto {
    id: string
    nombre: string
    nit: string
}

export default function CrearAdminPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const router = useRouter()
    const [conjunto, setConjunto] = useState<Conjunto | null>(null)
    const [loading, setLoading] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Form fields
    const [nombre, setNombre] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    useEffect(() => {
        fetchConjunto()
    }, [id])

    const fetchConjunto = async () => {
        try {
            const response = await fetch('/api/super/conjuntos')
            const data = await response.json()

            if (data.success) {
                const conj = data.data.find((c: any) => c.id === id)
                if (conj) {
                    setConjunto(conj)
                    if (conj.admin) {
                        setError('Este conjunto ya tiene un administrador')
                    }
                } else {
                    setError('Conjunto no encontrado')
                }
            }
        } catch (error) {
            console.error('Error al cargar conjunto:', error)
            setError('Error al cargar información del conjunto')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validaciones
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden')
            return
        }

        setGuardando(true)

        try {
            const response = await fetch('/api/super/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conjuntoId: id,
                    nombre,
                    email,
                    password,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/super-admin/dashboard')
                }, 2000)
            } else {
                setError(data.error || 'Error al crear administrador')
            }
        } catch (error) {
            setError('Error de conexión. Intenta nuevamente.')
        } finally {
            setGuardando(false)
        }
    }

    const generarPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789'
        let pass = ''
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setPassword(pass)
        setPasswordConfirm(pass)
    }

    if (loading) {
        return (
            <SuperAdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                </div>
            </SuperAdminLayout>
        )
    }

    if (!conjunto || error) {
        return (
            <SuperAdminLayout>
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <p className="text-center text-red-800">{error || 'Conjunto no encontrado'}</p>
                        <Button
                            onClick={() => router.push('/super-admin/dashboard')}
                            variant="outline"
                            className="mt-4 mx-auto block"
                        >
                            Volver al Dashboard
                        </Button>
                    </div>
                </div>
            </SuperAdminLayout>
        )
    }

    return (
        <SuperAdminLayout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/super-admin/dashboard')}
                    className="mb-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Dashboard
                </Button>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <UserPlus className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Crear Administrador
                        </h1>
                        <p className="text-slate-600">
                            Para el conjunto: <strong>{conjunto.nombre}</strong>
                        </p>
                        <p className="text-sm text-slate-500">
                            NIT: {conjunto.nit}
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <UserPlus className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-green-800 font-medium">
                                        ¡Administrador creado exitosamente!
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">
                                        Redirigiendo al dashboard...
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !success && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nombre Completo
                            </label>
                            <Input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Juan Pérez"
                                required
                                disabled={success}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@conjunto.com"
                                required
                                disabled={success}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Este email se usará para iniciar sesión
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Contraseña
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    disabled={success}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={generarPassword}
                                    variant="outline"
                                    disabled={success}
                                >
                                    Generar
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Usa el botón "Generar" para crear una contraseña segura
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Confirmar Contraseña
                            </label>
                            <Input
                                type="text"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="Repite la contraseña"
                                required
                                disabled={success}
                            />
                        </div>

                        {/* Resumen de credenciales */}
                        {password && password === passwordConfirm && password.length >= 6 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900 mb-2">
                                    Credenciales que se crearán:
                                </p>
                                <div className="bg-white rounded p-3 font-mono text-sm">
                                    <p className="text-slate-700">
                                        <strong>Email:</strong> {email}
                                    </p>
                                    <p className="text-slate-700">
                                        <strong>Contraseña:</strong> {password}
                                    </p>
                                </div>
                                <p className="text-xs text-blue-700 mt-2">
                                    ⚠️ Guarda estas credenciales y compártelas de forma segura con el administrador
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                onClick={() => router.push('/super-admin/dashboard')}
                                variant="outline"
                                className="flex-1"
                                disabled={guardando || success}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-slate-900 hover:bg-slate-800"
                                disabled={guardando || success}
                            >
                                {guardando ? 'Creando...' : 'Crear Administrador'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </SuperAdminLayout>
    )
}