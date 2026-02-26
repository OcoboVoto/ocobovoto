'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Button } from '@/components/ui/button'
import { Building2, Users, Calendar, Plus, Eye, FileText, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ConjuntoConAdmin } from '@/types'
import { FormularioConjunto } from '@/components/super-admin/FormularioConjunto'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'

interface AdminOption {
    id: string
    nombre: string
    email: string
    conjunto: { id: string; nombre: string }[]
}

// Modal para asignar admin existente a un conjunto
function ModalAsignarAdmin({
    conjuntoId,
    conjuntoNombre,
    onClose,
    onExito,
}: {
    conjuntoId: string
    conjuntoNombre: string
    onClose: () => void
    onExito: () => void
}) {
    const [admins, setAdmins] = useState<AdminOption[]>([])
    const [loading, setLoading] = useState(true)
    const [adminSeleccionado, setAdminSeleccionado] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/super/admins')
            .then(r => r.json())
            .then(d => { if (d.success) setAdmins(d.data) })
            .finally(() => setLoading(false))
    }, [])

    const handleAsignar = async () => {
        if (!adminSeleccionado) return
        setGuardando(true)
        setError('')
        try {
            const res = await fetch(`/api/super/conjuntos/${conjuntoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: adminSeleccionado }),
            })
            const data = await res.json()
            if (data.success) {
                onExito()
            } else {
                setError(data.error || 'Error al asignar administrador')
            }
        } catch {
            setError('Error de conexión')
        } finally {
            setGuardando(false)
        }
    }

    const adminInfo = admins.find(a => a.id === adminSeleccionado)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-1">Asignar Administrador</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Conjunto: <span className="font-medium text-slate-700">{conjuntoNombre}</span>
                </p>

                {loading ? (
                    <div className="py-6 text-center text-slate-400 text-sm">Cargando administradores...</div>
                ) : admins.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-sm">
                        No hay administradores disponibles.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <select
                            value={adminSeleccionado}
                            onChange={(e) => setAdminSeleccionado(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="">— Selecciona un administrador —</option>
                            {admins.map((admin) => (
                                <option key={admin.id} value={admin.id}>
                                    {admin.nombre} — {admin.email}
                                    {admin.conjunto.length > 0
                                        ? ` (${admin.conjunto.length} conjunto${admin.conjunto.length > 1 ? 's' : ''})`
                                        : ''}
                                </option>
                            ))}
                        </select>

                        {adminInfo && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                                <p className="font-medium">{adminInfo.nombre}</p>
                                <p className="text-blue-600">{adminInfo.email}</p>
                                {adminInfo.conjunto.length > 0 && (
                                    <p className="mt-1 text-blue-500">
                                        Ya administra: {adminInfo.conjunto.map(c => c.nombre).join(', ')}
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                                {error}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-3 mt-5">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 bg-slate-900 hover:bg-slate-800"
                        onClick={handleAsignar}
                        disabled={!adminSeleccionado || guardando}
                    >
                        {guardando ? 'Asignando...' : 'Asignar'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [conjuntos, setConjuntos] = useState<ConjuntoConAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [mostrarFormConjunto, setMostrarFormConjunto] = useState(false)
    const [modalAsignar, setModalAsignar] = useState<{ id: string; nombre: string } | null>(null)
    const { confirm, Dialog } = useConfirmDialog()

    useEffect(() => {
        fetchConjuntos()
    }, [])

    const fetchConjuntos = async () => {
        try {
            const response = await fetch('/api/super/conjuntos')
            const data = await response.json()
            if (data.success) setConjuntos(data.data)
        } catch (error) {
            console.error('Error al cargar conjuntos:', error)
        } finally {
            setLoading(false)
        }
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

    const totalAdminsActivos = conjuntos.filter(c => c.admin?.activo).length
    const totalAsambleas = conjuntos.reduce((acc, c) => acc + (c._count?.asambleas ?? 0), 0)
    const totalPropietarios = conjuntos.reduce((acc, c) => acc + (c._count?.propietarios ?? 0), 0)

    return (
        <SuperAdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg"><Building2 className="h-6 w-6 text-blue-600" /></div>
                        <div>
                            <p className="text-sm text-slate-600">Total Conjuntos</p>
                            <p className="text-2xl font-bold text-slate-900">{conjuntos.length}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg"><Users className="h-6 w-6 text-green-600" /></div>
                        <div>
                            <p className="text-sm text-slate-600">Admins Activos</p>
                            <p className="text-2xl font-bold text-slate-900">{totalAdminsActivos}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg"><Calendar className="h-6 w-6 text-purple-600" /></div>
                        <div>
                            <p className="text-sm text-slate-600">Total Asambleas</p>
                            <p className="text-2xl font-bold text-slate-900">{totalAsambleas}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg"><Users className="h-6 w-6 text-orange-600" /></div>
                        <div>
                            <p className="text-sm text-slate-600">Total Propietarios</p>
                            <p className="text-2xl font-bold text-slate-900">{totalPropietarios}</p>
                        </div>
                    </div>
                </div>

                {/* Header de sección */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Conjuntos Residenciales</h2>
                        <p className="text-slate-500 text-sm mt-1">Gestiona todos los conjuntos del sistema</p>
                    </div>
                    <Button
                        onClick={() => setMostrarFormConjunto(true)}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Conjunto
                    </Button>
                </div>

                {/* Lista de conjuntos */}
                {conjuntos.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                        <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No hay conjuntos registrados aún.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conjuntos.map((conjunto) => (
                            <div key={conjunto.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Nombre + badge */}
                                        <div className="flex items-center gap-3 flex-wrap mb-1">
                                            <h3 className="text-lg font-bold text-slate-900">{conjunto.nombre}</h3>
                                            {conjunto.admin ? (
                                                conjunto.admin.activo ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" /> Admin Activo
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" /> Admin Inactivo
                                                    </span>
                                                )
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                    Sin Administrador
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-500 mb-3">NIT: {conjunto.nit}</p>

                                        {/* Info del admin */}
                                        {conjunto.admin && (
                                            <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm">
                                                <p className="text-xs text-slate-500 mb-1">Administrador:</p>
                                                <p className="font-medium text-slate-900">{conjunto.admin.nombre}</p>
                                                <p className="text-slate-500">{conjunto.admin.email}</p>
                                            </div>
                                        )}

                                        {/* Contadores */}
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {conjunto._count?.asambleas ?? 0} asambleas
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {conjunto._count?.propietarios ?? 0} propietarios
                                            </span>
                                            <span>
                                                Creado {format(new Date(conjunto.createdAt), "d MMM yyyy", { locale: es })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {/* Si NO tiene admin: mostrar "Crear Admin" y "Elegir Admin" */}
                                        {!conjunto.admin && (
                                            <>
                                                <Button
                                                    onClick={() => router.push(`/super-admin/conjuntos/${conjunto.id}/crear-admin`)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Crear Admin
                                                </Button>
                                                <Button
                                                    onClick={() => setModalAsignar({ id: conjunto.id, nombre: conjunto.nombre })}
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Elegir Admin
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            onClick={() => router.push(`/super-admin/conjuntos/${conjunto.id}`)}
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver Detalles
                                        </Button>
                                        <Button
                                            onClick={() => router.push(`/super-admin/conjuntos/${conjunto.id}/asambleas`)}
                                            size="sm"
                                            variant="outline"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Asambleas
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Crear Conjunto */}
            {mostrarFormConjunto && (
                <FormularioConjunto
                    onClose={() => setMostrarFormConjunto(false)}
                    onResultado={({ success, message }) => {
                        confirm({
                            title: success ? 'Conjunto creado' : 'Error',
                            description: message,
                            confirmText: 'Aceptar',
                            variant: success ? 'success' : 'destructive',
                            hideCancel: true,
                            onConfirm: () => {
                                if (success) {
                                    setMostrarFormConjunto(false)
                                    fetchConjuntos()
                                }
                            }
                        })
                    }}
                />
            )}

            {/* Modal Asignar Admin Existente */}
            {modalAsignar && (
                <ModalAsignarAdmin
                    conjuntoId={modalAsignar.id}
                    conjuntoNombre={modalAsignar.nombre}
                    onClose={() => setModalAsignar(null)}
                    onExito={() => {
                        setModalAsignar(null)
                        confirm({
                            title: 'Administrador asignado',
                            description: 'El administrador fue asignado correctamente al conjunto.',
                            confirmText: 'Aceptar',
                            variant: 'success',
                            hideCancel: true,
                            onConfirm: fetchConjuntos,
                        })
                    }}
                />
            )}

            {Dialog}
        </SuperAdminLayout>
    )
}