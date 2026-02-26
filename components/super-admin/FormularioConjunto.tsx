'use client'

import { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Lock, UserPlus, Users } from 'lucide-react'

interface AdminOption {
    id: string
    nombre: string
    email: string
    conjunto: { id: string; nombre: string }[]
}

interface FormularioConjuntoProps {
    onResultado?: (result: {
        success: boolean
        message: string
    }) => void
    onClose: () => void
}

export function FormularioConjunto({ onClose, onResultado, }: FormularioConjuntoProps) {

    const [nombre, setNombre] = useState('')
    const [nit, setNit] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [admins, setAdmins] = useState<AdminOption[]>([])
    const [loadingAdmins, setLoadingAdmins] = useState(true)
    const [adminSeleccionado, setAdminSeleccionado] = useState<string>('')
    const COEFICIENTE_FIJO = 100

    useEffect(() => {
        fetchAdmins()
    }, [])

    const fetchAdmins = async () => {
        try {
            const res = await fetch('/api/super/admins')
            const data = await res.json()
            console.log('admins', data)
            if (data.success) setAdmins(data.data)
        } catch (e) {
            console.error('Error cargando admins', e)
        } finally {
            setLoadingAdmins(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setGuardando(true)

        try {
            const body: any = { nombre, nit, coeficienteTotal: COEFICIENTE_FIJO }
            if (adminSeleccionado) body.adminId = adminSeleccionado

            const response = await fetch('/api/super/conjuntos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (data.success) {
                onResultado?.({
                    success: true,
                    message: 'Conjunto Creado Exitosamente'
                })
            } else {
                onResultado?.({
                    success: false,
                    message: data.error || 'Error al crear el conjunto'
                })
            }
        } catch (error) {
            onResultado?.({
                success: false,
                message: 'Error de conexión con el servidor'
            })
        } finally {
            setGuardando(false)
        }
    }

    const adminInfo = admins.find(a => a.id === adminSeleccionado)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-semibold mb-4">Crear Nuevo Conjunto</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nombre del Conjunto
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="Conjunto Residencial Las Flores"
                            required
                        />
                    </div>

                    {/* NIT */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">NIT</label>
                        <input
                            type="text"
                            value={nit}
                            onChange={(e) => setNit(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="900123456-7"
                            required
                        />
                    </div>

                    {/* Coeficiente (readonly) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-slate-500" />
                            Coeficiente Total (%)
                            <span className="text-xs text-slate-500 font-normal">(no modificable)</span>
                        </label>
                        <input
                            type="number"
                            value={COEFICIENTE_FIJO}
                            readOnly
                            disabled
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            El coeficiente total siempre es 100%. Se distribuye automáticamente entre los propietarios.
                        </p>
                    </div>

                    {/* Selector de Administrador */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            Administrador
                            <span className="text-xs text-slate-500 font-normal">(opcional)</span>
                        </label>

                        {loadingAdmins ? (
                            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-400 text-sm">
                                Cargando administradores...
                            </div>
                        ) : (
                            <select
                                value={adminSeleccionado}
                                onChange={(e) => setAdminSeleccionado(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                            >
                                <option value="">— Sin administrador (asignar después) —</option>
                                {admins.map((admin) => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.nombre} — {admin.email}
                                        {admin.conjunto.length > 0
                                            ? ` (${admin.conjunto.length} conjunto${admin.conjunto.length > 1 ? 's' : ''})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Info del admin seleccionado */}
                        {adminInfo && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                                <p className="font-medium">{adminInfo.nombre}</p>
                                <p className="text-blue-600">{adminInfo.email}</p>
                                {adminInfo.conjunto.length > 0 && (
                                    <p className="mt-1 text-blue-500">
                                        Ya administra: {adminInfo.conjunto.map(c => c.nombre).join(', ')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Hint cuando no se selecciona admin */}
                        {!adminSeleccionado && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <UserPlus className="h-3 w-3" />
                                Podrás crear un administrador desde el dashboard después de crear el conjunto.
                            </p>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                            disabled={guardando}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-slate-900 hover:bg-slate-800"
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando...' : 'Crear Conjunto'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
