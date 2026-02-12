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
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCedula, setFiltroCedula] = useState('')
  const [filtroTorre, setFiltroTorre] = useState('')
  const [filtroApto, setFiltroApto] = useState('')
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
          onConfirm: () => { },
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
          onConfirm: () => { },
        })
      }
    } catch (error) {
      confirm({
        title: 'Error de conexión',
        description: 'No fue posible actualizar. Intenta nuevamente.',
        confirmText: 'Aceptar',
        variant: 'destructive',
        hideCancel: true,
        onConfirm: () => { },
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
              onConfirm: () => { },
            })
            onActualizar()
          } else {
            confirm({
              title: 'Error',
              description: data.error || 'Ocurrió un error al eliminar el propietario.',
              confirmText: 'Aceptar',
              variant: 'destructive',
              hideCancel: true,
              onConfirm: () => { },
            })
          }
        } catch (error) {
          confirm({
            title: 'Error de conexión',
            description: 'No fue posible eliminar. Intenta nuevamente.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => { },
          })
        }
      },
    })
  }
  const propietariosFiltrados = propietarios.filter((p) => {
    const coincideNombre =
      filtroNombre.trim().toLowerCase() === '' ||
      p.nombreCompleto.toLowerCase().includes(filtroNombre.toLowerCase())

    const coincideCedula =
      filtroCedula === '' ||
      p.cedula.includes(filtroCedula)

    const coincideTorre =
      filtroTorre === '' ||
      p.torreManzana.toLowerCase().includes(filtroTorre.toLowerCase())

    const coincideApto =
      filtroApto === '' ||
      p.aptoCasa.toLowerCase().includes(filtroApto.toLowerCase())

    return coincideNombre && coincideCedula && coincideTorre && coincideApto
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          type="text"
          placeholder="Nombre"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />

        <Input
          type="text"
          placeholder="Cédula"
          value={filtroCedula}
          onChange={(e) => setFiltroCedula(e.target.value)}
        />

        <Input
          type="text"
          placeholder="Torre"
          value={filtroTorre}
          onChange={(e) => setFiltroTorre(e.target.value)}
        />

        <Input
          type="text"
          placeholder="Apto"
          value={filtroApto}
          onChange={(e) => setFiltroApto(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Torre</TableHead>
              <TableHead>Apto</TableHead>
              <TableHead>Coeficiente</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propietariosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  {filtroApto || filtroCedula || filtroNombre || filtroTorre ? 'No se encontraron resultados' : 'No hay propietarios cargados'}
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
                        <Input
                          value={formData.torreManzana || ''}
                          onChange={(e) => setFormData({ ...formData, torreManzana: e.target.value })}
                          placeholder="Torre"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.aptoCasa || ''}
                          onChange={(e) => setFormData({ ...formData, aptoCasa: e.target.value })}
                          placeholder="Apto"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.coeficiente || 0}
                          onChange={(e) => setFormData({ ...formData, coeficiente: parseFloat(e.target.value) })}
                          type="number"
                          step="0.01"
                          disabled
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
                        {prop.torreManzana}
                      </TableCell>
                      <TableCell>
                        {prop.aptoCasa}
                      </TableCell>
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