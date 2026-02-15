import { useState } from "react"
import { Button } from "../ui/button"
import { Lock } from 'lucide-react'

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
    const COEFICIENTE_FIJO = 100

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setGuardando(true)

        try {
            const response = await fetch('/api/super/conjuntos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    nit,
                    coeficienteTotal: COEFICIENTE_FIJO,
                }),
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-semibold mb-4">Crear Nuevo Conjunto</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            NIT
                        </label>
                        <input
                            type="text"
                            value={nit}
                            onChange={(e) => setNit(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="900123456-7"
                            required
                        />
                    </div>

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