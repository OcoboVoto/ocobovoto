'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Button } from '@/components/ui/button'
import {
    Building2,
    Users,
    Calendar,
    Plus,
    Eye,
    FileText,
    CheckCircle,
    XCircle,
    UserPlus
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ConjuntoConAdmin } from '@/types'
import { FormularioConjunto } from '@/components/super-admin/FormularioConjunto'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [conjuntos, setConjuntos] = useState<ConjuntoConAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [mostrarFormConjunto, setMostrarFormConjunto] = useState(false)
    const { confirm, Dialog } = useConfirmDialog()

    useEffect(() => {
        fetchConjuntos()
    }, [])

    const fetchConjuntos = async () => {
        try {
            const response = await fetch('/api/super/conjuntos')
            const data = await response.json()

            if (data.success) {
                setConjuntos(data.data)
            }
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

    return (
        <SuperAdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Total Conjuntos</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {conjuntos.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Admins Activos</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {conjuntos.filter(c => c.admin?.activo).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Calendar className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Total Asambleas</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {conjuntos.reduce((sum, c) => sum + c._count.asambleas, 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <Users className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Total Propietarios</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {conjuntos.reduce((sum, c) => sum + c._count.propietarios, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header con botón */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Conjuntos Residenciales</h2>
                        <p className="text-slate-600 mt-1">Gestiona todos los conjuntos del sistema</p>
                    </div>
                    <Button
                        onClick={() => setMostrarFormConjunto(true)}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Conjunto
                    </Button>
                </div>

                {/* Lista de Conjuntos */}
                {conjuntos.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                        <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            No hay conjuntos registrados
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Crea el primer conjunto para comenzar
                        </p>
                        <Button
                            onClick={() => setMostrarFormConjunto(true)}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Primer Conjunto
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {conjuntos.map((conjunto) => (
                            <div
                                key={conjunto.id}
                                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-slate-900">
                                                {conjunto.nombre}
                                            </h3>
                                            {conjunto.admin ? (
                                                conjunto.admin.activo ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Admin Activo
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        Admin Inactivo
                                                    </span>
                                                )
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                    Sin Administrador
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 mb-4">
                                            NIT: {conjunto.nit}
                                        </p>

                                        {conjunto.admin && (
                                            <div className="bg-slate-50 rounded-lg p-3 mb-4">
                                                <p className="text-xs text-slate-500 mb-1">Administrador:</p>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {conjunto.admin.nombre}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    {conjunto.admin.email}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-6 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>{conjunto._count.asambleas} asambleas</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                <span>{conjunto._count.propietarios} propietarios</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
                                                    Creado {format(new Date(conjunto.createdAt), "d MMM yyyy", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {!conjunto.admin && (
                                            <Button
                                                onClick={() => router.push(`/super-admin/conjuntos/${conjunto.id}/crear-admin`)}
                                                size="sm"
                                                variant="outline"
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Crear Admin
                                            </Button>
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

            {/* Diálogo de Confirmación */}
            {Dialog}
        </SuperAdminLayout>
    )
}
