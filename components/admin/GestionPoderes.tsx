// components/admin/GestionPoderes.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

const PAGE_SIZE = 8

interface Otorgante {
  id: string
  nombreCompleto: string
  cedula: string
  torreManzana?: string
  aptoCasa?: string
  coeficiente: number
}

interface Poder {
  id: string
  nombreApoderado: string
  cedulaApoderado: string
  activo: boolean
  propietarioOtorgante?: Otorgante
  otorgante?: Otorgante
}

interface GestionPoderesProps {
  asambleaId: string
}

export function GestionPoderes({ asambleaId }: GestionPoderesProps) {
  const [poderes, setPoderes] = useState<Poder[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const [cedulaOtorgante, setCedulaOtorgante] = useState('')
  const [cedulaApoderado, setCedulaApoderado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [errorForm, setErrorForm] = useState('')

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCedula, setEditCedula] = useState('')
  const [editError, setEditError] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const { confirm, Dialog } = useConfirmDialog()

  useEffect(() => { fetchPoderes(false) }, [asambleaId])
  useEffect(() => { setPagina(1) }, [busqueda])

  const fetchPoderes = async (silencioso = false) => {
    if (silencioso) {
      setActualizando(true)
    } else {
      setLoading(true)
    }
    try {
      const response = await fetch(`/api/poderes?asambleaId=${asambleaId}`)
      const data = await response.json()
      if (data.success) setPoderes(data.data || [])
    } catch (error) {
      console.error('Error al cargar poderes:', error)
    } finally {
      setLoading(false)
      setActualizando(false)
    }
  }

  const poderesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return poderes
    return poderes.filter((p) => {
      const o = p.propietarioOtorgante ?? p.otorgante
      return (
        o?.nombreCompleto?.toLowerCase().includes(q) ||
        o?.cedula?.toLowerCase().includes(q) ||
        p.nombreApoderado?.toLowerCase().includes(q) ||
        p.cedulaApoderado?.toLowerCase().includes(q)
      )
    })
  }, [poderes, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(poderesFiltrados.length / PAGE_SIZE))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const poderesPagina = poderesFiltrados.slice(
    (paginaSegura - 1) * PAGE_SIZE,
    paginaSegura * PAGE_SIZE
  )

  const otorgarPoder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorForm('')
    if (!cedulaOtorgante.trim() || !cedulaApoderado.trim() || !nombreApoderado.trim()) {
      setErrorForm('Completa todos los campos')
      return
    }

    setGuardando(true)

    try {
      const res = await fetch('/api/poderes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asambleaId, cedulaOtorgante, cedulaApoderado, nombreApoderado }),
      })

      const data = await res.json()

      if (data.success) {
        const cantidad = Array.isArray(data.data) ? data.data.length : 1
        confirm({
          title: 'Poder(es) Otorgado(s)',
          description: data.message,
          confirmText: 'Aceptar', variant: 'success', hideCancel: true, onConfirm: () => { },
        })

        setCedulaOtorgante(''); setCedulaApoderado(''); setNombreApoderado('')
        fetchPoderes(true)
      } else {
        confirm({
          title: 'Error al otorgar poder', description: data.error || 'Error desconocido.',
          confirmText: 'Aceptar', variant: 'destructive', hideCancel: true, onConfirm: () => { },
        })
      }
    } catch {
      confirm({
        title: 'Error de conexión', description: 'No fue posible conectar. Intenta nuevamente.',
        confirmText: 'Aceptar', variant: 'destructive', hideCancel: true, onConfirm: () => { },
      })
    } finally {
      setGuardando(false)
    }
  }

  const iniciarEdicion = (poder: Poder) => {
    setEditandoId(poder.id)
    setEditNombre(poder.nombreApoderado)
    setEditCedula(poder.cedulaApoderado)
    setEditError('')
  }

  const cancelarEdicion = () => {
    setEditandoId(null); setEditNombre(''); setEditCedula(''); setEditError('')
  }

  const guardarEdicion = async (poderId: string) => {
    if (!editNombre.trim() || !editCedula.trim()) {
      setEditError('Nombre y cédula son obligatorios'); return
    }

    setGuardandoEdit(true); setEditError('')

    try {
      const res = await fetch(`/api/poderes/${poderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId,
          nombreApoderado: editNombre.trim(),
          cedulaApoderado: editCedula.trim(),
        }),
      })
      const data = await res.json()

      if (data.success) {
        cancelarEdicion()
        fetchPoderes(true)
      }
      else { setEditError(data.error) }

    } catch { setEditError('Error de conexión al guardar') }
    finally { setGuardandoEdit(false) }
  }

  const handleEliminar = (poder: Poder) => {
    confirm({
      title: '¿Eliminar poder?',
      description: `Se eliminará el poder de "${poder.nombreApoderado}" (CC: ${poder.cedulaApoderado}). Si ya está registrado como votante, primero debes anular su registro.`,
      confirmText: 'Sí, eliminar', cancelText: 'Cancelar', variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/poderes/${poder.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asambleaId }),
          })

          const data = await res.json()

          if (data.success) { fetchPoderes(true) }
          else {
            confirm({
              title: 'No se pudo eliminar', description: data.error,
              confirmText: 'Entendido', variant: 'destructive', hideCancel: true, onConfirm: () => { },
            })
          }
        } catch {
          confirm({
            title: 'Error de conexión', description: 'No fue posible eliminar el poder.',
            confirmText: 'Aceptar', variant: 'destructive', hideCancel: true, onConfirm: () => { },
          })
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          Otorgar Nuevo Poder
        </h3>
        <form onSubmit={otorgarPoder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cédula del otorgante *</label>
              <Input placeholder="Propietario que otorga" value={cedulaOtorgante} onChange={(e) => setCedulaOtorgante(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cédula del apoderado *</label>
              <Input placeholder="Quien recibirá el poder" value={cedulaApoderado} onChange={(e) => setCedulaApoderado(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del apoderado *</label>
              <Input placeholder="Nombre completo" value={nombreApoderado} onChange={(e) => setNombreApoderado(e.target.value)} />
            </div>
          </div>
          {errorForm && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorForm}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Otorgar Poder'}</Button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Header con contador y buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">
            Poderes Otorgados{' '}
            <span className="text-sm font-normal text-gray-500">
              ({poderesFiltrados.length}{busqueda ? ` de ${poderes.length}` : ''})
            </span>
            {/* Indicador sutil de actualización silenciosa */}
            {actualizando && (
              <span className="inline-block h-3 w-3 rounded-full bg-red-400 animate-pulse" title="Actualizando..." />
            )}
          </h3>
          {poderes.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o cédula…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3 py-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : poderes.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No hay poderes otorgados para esta asamblea</p>
        ) : poderesFiltrados.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No se encontraron poderes con "{busqueda}"</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center text-gray-500">#</TableHead>
                    <TableHead>Otorgante</TableHead>
                    <TableHead>Apoderado</TableHead>
                    <TableHead className="text-right">Coeficiente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poderesPagina.map((poder, idx) => {
                    const otorgante = poder.propietarioOtorgante ?? poder.otorgante
                    const numFila = (paginaSegura - 1) * PAGE_SIZE + idx + 1
                    const estaEditando = editandoId === poder.id

                    return (
                      <TableRow key={poder.id}>
                        <TableCell className="text-center text-gray-400 text-sm">{numFila}</TableCell>

                        <TableCell>
                          <p className="font-medium text-gray-900 text-sm">{otorgante?.nombreCompleto}</p>
                          <p className="text-xs text-gray-500">CC: {otorgante?.cedula}</p>
                          {otorgante?.torreManzana && (
                            <p className="text-xs text-gray-400">{otorgante.torreManzana} {otorgante.aptoCasa}</p>
                          )}
                        </TableCell>

                        {/* ✅ FIX: celda apoderado con ancho contenido */}
                        <TableCell className="max-w-[200px]">
                          {estaEditando ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              <Input
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                placeholder="Nombre"
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <Input
                                value={editCedula}
                                onChange={(e) => setEditCedula(e.target.value)}
                                placeholder="Cédula"
                                className="h-8 text-sm"
                              />
                              {editError && <p className="text-xs text-red-600">{editError}</p>}
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{poder.nombreApoderado}</p>
                              <p className="text-xs text-gray-500">CC: {poder.cedulaApoderado}</p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-semibold text-indigo-700 text-sm">
                          {Number(otorgante?.coeficiente).toFixed(4)}%
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Activo
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          {estaEditando ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" disabled={guardandoEdit}
                                onClick={() => guardarEdicion(poder.id)}
                                className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8 p-0"
                                title="Guardar">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" disabled={guardandoEdit}
                                onClick={cancelarEdicion}
                                className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                                title="Cancelar">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => iniciarEdicion(poder)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEliminar(poder)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                title="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Página {paginaSegura} de {totalPaginas} · {poderesFiltrados.length} poder(es)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={paginaSegura <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={paginaSegura >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {Dialog}
    </div>
  )
}