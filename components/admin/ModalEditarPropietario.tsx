// components/admin/ModalEditarPropietario.tsx

'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@radix-ui/react-select'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

interface Propietario {
    id: string
    nombreCompleto: string
    cedula: string
    torreManzana: string
    aptoCasa: string
    coeficiente: number
}

interface ModalEditarPropietarioProps {
    propietario: Propietario
    onClose: () => void
    onGuardado: () => void
}

export function ModalEditarPropietario({
    propietario,
    onClose,
    onGuardado
}: ModalEditarPropietarioProps) {
    const [formData, setFormData] = useState({
        nombreCompleto: propietario.nombreCompleto,
        cedula: propietario.cedula,
        torreManzana: propietario.torreManzana,
        aptoCasa: propietario.aptoCasa,
    })
    const [guardando, setGuardando] = useState(false)
    const { confirm, Dialog } = useConfirmDialog()


    const handleChange = (campo: string, valor: string) => {
        setFormData(prev => ({ ...prev, [campo]: valor }))
    }

    const handleGuardar = async () => {
        setGuardando(true)

        try {
            const response = await fetch(`/api/propietarios/${propietario.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                confirm({
                    title: 'Propietario Actualizado',
                    description: 'Los cambios se guardaron correctamente',
                    confirmText: 'Aceptar',
                    variant: 'success',
                    hideCancel: true,
                    onConfirm: () => { },
                })
                onGuardado()
            } else {
                confirm({
                    title: 'Error',
                    description: data.error || 'No se pudo actualizar el propietario',
                    confirmText: 'Aceptar',
                    variant: 'destructive',
                    hideCancel: true,
                    onConfirm: () => { },
                })
            }
        } catch (error) {
            confirm({
                title: 'Error de conexión',
                description: 'No se pudo guardar. Intenta nuevamente.',
                confirmText: 'Aceptar',
                variant: 'destructive',
                hideCancel: true,
                onConfirm: () => { },
            })
        } finally {
            setGuardando(false)
        }
    }

    return (
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Editar Propietario</DialogTitle>
                <DialogDescription>
                    Modifica los datos del propietario
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Nombre Completo</Label>
                    <Input
                        id="nombreCompleto"
                        value={formData.nombreCompleto}
                        onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                        placeholder="Juan Pérez"
                    />
                </div>

                <div className="grid gap-2">
                    <Label >Cédula</Label>
                    <Input
                        id="cedula"
                        value={formData.cedula}
                        onChange={(e) => handleChange('cedula', e.target.value)}
                        placeholder="1234567890"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Torre/Manzana</Label>
                        <Input
                            id="torreManzana"
                            value={formData.torreManzana}
                            onChange={(e) => handleChange('torreManzana', e.target.value)}
                            placeholder="Torre A"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Apto/Casa</Label>
                        <Input
                            id="aptoCasa"
                            value={formData.aptoCasa}
                            onChange={(e) => handleChange('aptoCasa', e.target.value)}
                            placeholder="101"
                        />
                    </div>
                </div>

                {/* ✅ PUNTO 5: Campo coeficiente bloqueado (solo lectura) */}
                <div className="grid gap-2">
                    <Label>
                        Coeficiente (%)
                        <span className="text-xs text-gray-500 ml-2">(No modificable)</span>
                    </Label>
                    <Input
                        id="coeficiente"
                        value={propietario.coeficiente}
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                        El coeficiente no se puede modificar después de crear el propietario
                    </p>
                </div>

            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={guardando}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button onClick={handleGuardar} disabled={guardando}>
                    <Save className="mr-2 h-4 w-4" />
                    {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}