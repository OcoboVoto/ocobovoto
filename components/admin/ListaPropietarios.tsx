'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table'
import { Edit, Save, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react'
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

interface Propietario {
  id: string
  nombreCompleto: string
  cedula: string
  torreManzana: string
  aptoCasa: string
  coeficiente: number
  bloqueadoParaVotar: boolean
  motivoBloqueo: string | null
}

const ITEMS_POR_PAGINA = 15

export function ListaPropietarios({ propietarios, onActualizar }: ListaPropietariosProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Propietario>>({})
  const [guardando, setGuardando] = useState(false)
  const [bloqueandoId, setBloqueandoId] = useState<string | null>(null)
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCedula, setFiltroCedula] = useState('')
  const [filtroTorre, setFiltroTorre] = useState('')
  const [filtroApto, setFiltroApto] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
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
            // Ajustar página si queda vacía
            const nuevoTotal = propietariosFiltrados.length - 1
            const nuevasTotalPaginas = Math.ceil(nuevoTotal / ITEMS_POR_PAGINA)
            if (paginaActual > nuevasTotalPaginas && nuevasTotalPaginas > 0) {
              setPaginaActual(nuevasTotalPaginas)
            }
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

  // Toggle bloqueo de voto con confirmación
  const toggleBloqueo = (prop: Propietario) => {
    const bloqueando = !prop.bloqueadoParaVotar
    confirm({
      title: bloqueando ? '¿Bloquear derecho al voto?' : '¿Restablecer derecho al voto?',
      description: bloqueando
        ? `${prop.nombreCompleto} podrá registrarse en la asamblea pero NO podrá votar.`
        : `${prop.nombreCompleto} recuperará su derecho al voto en futuras asambleas.`,
      confirmText: bloqueando ? 'Bloquear voto' : 'Restablecer voto',
      cancelText: 'Cancelar',
      variant: bloqueando ? 'destructive' : 'success',
      onConfirm: async () => {
        setBloqueandoId(prop.id)
        try {
          const response = await fetch(`/api/propietarios/${prop.id}/bloqueo`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bloqueadoParaVotar: bloqueando }),
          })
          const data = await response.json()
          if (data.success) {
            onActualizar()
          } else {
            confirm({
              title: 'Error',
              description: data.error || 'No se pudo actualizar el estado de bloqueo.',
              confirmText: 'Aceptar',
              variant: 'destructive',
              hideCancel: true,
              onConfirm: () => { },
            })
          }
        } catch {
          confirm({
            title: 'Error de conexión',
            description: 'No fue posible actualizar. Intenta nuevamente.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => { },
          })
        } finally {
          setBloqueandoId(null)
        }
      },
    })
  }

  const propietariosFiltrados = propietarios.filter((p) => {
    const coincideNombre =
      filtroNombre.trim().toLowerCase() === '' ||
      p.nombreCompleto.toLowerCase().includes(filtroNombre.toLowerCase())
    const coincideCedula =
      filtroCedula === '' || p.cedula.includes(filtroCedula)
    const coincideTorre =
      filtroTorre === '' ||
      p.torreManzana.toLowerCase().includes(filtroTorre.toLowerCase())
    const coincideApto =
      filtroApto === '' ||
      p.aptoCasa.toLowerCase().includes(filtroApto.toLowerCase())
    return coincideNombre && coincideCedula && coincideTorre && coincideApto
  })

  // Paginación
  const totalPaginas = Math.ceil(propietariosFiltrados.length / ITEMS_POR_PAGINA)
  const propietariosPaginados = propietariosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  // Resetear página cuando cambian los filtros
  const handleFiltro = (setter: (v: string) => void, valor: string) => {
    setter(valor)
    setPaginaActual(1)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          type="text"
          placeholder="Nombre"
          value={filtroNombre}
          onChange={(e) => handleFiltro(setFiltroNombre, e.target.value)}
        />
        <Input
          type="text"
          placeholder="Cédula"
          value={filtroCedula}
          onChange={(e) => handleFiltro(setFiltroCedula, e.target.value)}
        />
        <Input
          type="text"
          placeholder="Torre"
          value={filtroTorre}
          onChange={(e) => handleFiltro(setFiltroTorre, e.target.value)}
        />
        <Input
          type="text"
          placeholder="Apto"
          value={filtroApto}
          onChange={(e) => handleFiltro(setFiltroApto, e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Torre</TableHead>
              <TableHead>Apto</TableHead>
              <TableHead>Coeficiente</TableHead>
              <TableHead className="text-center">Estado voto</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propietariosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  {filtroApto || filtroCedula || filtroNombre || filtroTorre
                    ? 'No se encontraron resultados'
                    : 'No hay propietarios cargados'}
                </TableCell>
              </TableRow>
            ) : (
              propietariosPaginados.map((prop, index) => {
                const indexGlobal = (paginaActual - 1) * ITEMS_POR_PAGINA + index
                return (
                  <TableRow
                    key={prop.id}
                    className={prop.bloqueadoParaVotar ? 'bg-red-50 hover:bg-red-100' : undefined}
                  >
                    <TableCell className="text-center text-sm text-gray-400 font-mono">
                      {indexGlobal + 1}
                    </TableCell>
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
                        <TableCell />
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={guardarEdicion} disabled={guardando}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelarEdicion} disabled={guardando}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{prop.nombreCompleto}</span>
                            {prop.bloqueadoParaVotar && prop.motivoBloqueo && (
                              <span className="text-xs text-red-500 mt-0.5">{prop.motivoBloqueo}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{prop.cedula}</TableCell>
                        <TableCell>{prop.torreManzana}</TableCell>
                        <TableCell>{prop.aptoCasa}</TableCell>
                        <TableCell>{prop.coeficiente}%</TableCell>
                        <TableCell className="text-center">
                          {prop.bloqueadoParaVotar ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <ShieldOff className="h-3 w-3" />
                              Sin voto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <ShieldCheck className="h-3 w-3" />
                              Con voto
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => iniciarEdicion(prop)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleBloqueo(prop)}
                              disabled={bloqueandoId === prop.id}
                              title={prop.bloqueadoParaVotar ? 'Restablecer voto' : 'Bloquear voto'}
                            >
                              {prop.bloqueadoParaVotar
                                ? <ShieldCheck className="h-4 w-4 text-green-600" />
                                : <ShieldOff className="h-4 w-4 text-amber-500" />
                              }
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => eliminar(prop.id, prop.nombreCompleto)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginador */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}-
            {Math.min(paginaActual * ITEMS_POR_PAGINA, propietariosFiltrados.length)} de{' '}
            {propietariosFiltrados.length} propietarios
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPaginaActual(1)} disabled={paginaActual === 1} className="h-8 px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setPaginaActual((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="h-8 px-3">‹</Button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPaginas || Math.abs(page - paginaActual) <= 1)
              .reduce<(number | string)[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(page)
                return acc
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={paginaActual === item ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaginaActual(item as number)}
                    className="h-8 w-8 p-0"
                  >
                    {item}
                  </Button>
                )
              )}

            <Button variant="outline" size="sm" onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="h-8 px-3">›</Button>
            <Button variant="outline" size="sm" onClick={() => setPaginaActual(totalPaginas)} disabled={paginaActual === totalPaginas} className="h-8 px-2">»</Button>
          </div>
        </div>
      )}

      {totalPaginas <= 1 && (
        <p className="text-sm text-gray-500 px-2">
          Mostrando {propietariosFiltrados.length} de {propietarios.length} propietarios
        </p>
      )}

      {Dialog}
    </div>
  )
}