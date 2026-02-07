'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Save, X, Trash2, Search } from 'lucide-react'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'

interface Propietario {
  id: string
  nombreCompleto: string
  cedula: string
  torreManzana: string
  aptoCasa: string
  celular: string | null
  email: string | null
  coeficiente: number
}

interface ListaPropietariosProps {
  propietarios: Propietario[]
  onActualizar: () => void
}

export function ListaPropietarios({ propietarios, onActualizar }: ListaPropietariosProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Propietario>>({})
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const { confirm, Dialog } = useConfirmDialog()

  const iniciarEdicion = (prop: Propietario) => {
    setEditandoId(prop.id)
    setFormData(prop)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setFormData({})
  }

  const guardarEdicion = async () => {
    if (!editandoId) return

    setGuardando(true)

    try {
      const response = await fetch(`/api/propietarios/${editandoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        confirm({
            title: 'Actualización',
            description: 'Propietario Actualizado',
            confirmText: 'Aceptar',
            variant: 'success',
            hideCancel: true,
            onConfirm: () => {},
          })
        setEditandoId(null)
        setFormData({})
        onActualizar()
      } else {
        confirm({
            title: 'Error',
            description: data.error || 'Ocurrió un error al actualizar el propietario.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => {},
          })
      }
    } catch (error) {
        confirm({
            title: 'Error de conexión',
            description: 'No fue posible actualizar. Intenta nuevamente.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => {},
    })
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string, nombre: string) => {
    confirm({
        title: '¿Eliminar Propietario?',
        description: `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
        onConfirm: async () => {

    try {
      const response = await fetch(`/api/propietarios/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        confirm({
            title: 'Actualización',
            description: 'Propietario Eliminado',
            confirmText: 'Aceptar',
            variant: 'success',
            hideCancel: true,
            onConfirm: () => {},
          })
        onActualizar()
      } else {
        confirm({
            title: 'Error',
            description: data.error || 'Ocurrió un error al eliminar el propietario.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => {},
          })
      }
    } catch (error) {
        confirm({
            title: 'Error de conexión',
            description: 'No fue posible eliminar. Intenta nuevamente.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => {},
        })
    }
  },
})
}

  const propietariosFiltrados = propietarios.filter(p =>
    p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.cedula.includes(busqueda) ||
    p.torreManzana.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.aptoCasa.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Buscar por nombre, cédula, torre o apto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Coeficiente</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propietariosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  {busqueda ? 'No se encontraron resultados' : 'No hay propietarios cargados'}
                </TableCell>
              </TableRow>
            ) : (
              propietariosFiltrados.map((prop) => (
                <TableRow key={prop.id}>
                  {editandoId === prop.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={formData.nombreCompleto || ''}
                          onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.cedula || ''}
                          onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                          maxLength={12}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            value={formData.torreManzana || ''}
                            onChange={(e) => setFormData({ ...formData, torreManzana: e.target.value })}
                            placeholder="Torre"
                            className="w-20"
                          />
                          <Input
                            value={formData.aptoCasa || ''}
                            onChange={(e) => setFormData({ ...formData, aptoCasa: e.target.value })}
                            placeholder="Apto"
                            className="w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.celular || ''}
                          onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          type="email"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.coeficiente || 0}
                          onChange={(e) => setFormData({ ...formData, coeficiente: parseFloat(e.target.value) })}
                          type="number"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={guardarEdicion}
                            disabled={guardando}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelarEdicion}
                            disabled={guardando}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{prop.nombreCompleto}</TableCell>
                      <TableCell>{prop.cedula}</TableCell>
                      <TableCell>
                        {prop.torreManzana} {prop.aptoCasa}
                      </TableCell>
                      <TableCell>{prop.celular || '-'}</TableCell>
                      <TableCell>{prop.email || '-'}</TableCell>
                      <TableCell>{prop.coeficiente}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => iniciarEdicion(prop)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => eliminar(prop.id, prop.nombreCompleto)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-gray-600">
        Mostrando {propietariosFiltrados.length} de {propietarios.length} propietarios
      </p>
      {Dialog}
    </div>
  )
}