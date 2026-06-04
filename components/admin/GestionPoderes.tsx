// components/admin/GestionPoderes.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search, Pencil, Trash2, Check, X,
  ChevronLeft, ChevronRight, UserPlus,
  Loader2, Building2, CheckSquare, Square,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

const PAGE_SIZE = 8

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface UnidadDetalle {
  id: string
  torreManzana: string
  aptoCasa: string
  coeficiente: number
  tienePoder: boolean
}

interface OtorganteInfo {
  nombreCompleto: string
  cedula: string
  esMultiple: boolean          // true cuando tiene > 1 unidad registrada
  unidades: UnidadDetalle[]    // solo las SIN poder (filtradas desde la API)
}

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

// ─── Componente ──────────────────────────────────────────────────────────────

export function GestionPoderes({ asambleaId }: GestionPoderesProps) {
  // Lista de poderes
  const [poderes, setPoderes] = useState<Poder[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  // Formulario nuevo poder
  const [cedulaOtorgante, setCedulaOtorgante] = useState('')
  const [cedulaApoderado, setCedulaApoderado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  // Lookup automático de la cédula del otorgante
  const [buscandoOtorgante, setBuscandoOtorgante] = useState(false)
  const [otorganteInfo, setOtorganteInfo] = useState<OtorganteInfo | null>(null)
  const [errorLookup, setErrorLookup] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Unidades seleccionadas con checkbox (solo para caso multi-unidad)
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<Set<string>>(new Set())

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCedula, setEditCedula] = useState('')
  const [editError, setEditError] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const { confirm, Dialog } = useConfirmDialog()

  useEffect(() => { fetchPoderes(false) }, [asambleaId])
  useEffect(() => { setPagina(1) }, [busqueda])

  // ── Lookup con debounce al escribir la cédula del otorgante ────────────────
  useEffect(() => {
    setOtorganteInfo(null)
    setErrorLookup('')
    setUnidadesSeleccionadas(new Set())

    const cedula = cedulaOtorgante.trim()
    if (cedula.length < 4) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setBuscandoOtorgante(true)
      try {
        const res = await fetch(
          `/api/propietarios/buscar?cedula=${encodeURIComponent(cedula)}&asambleaId=${asambleaId}`
        )
        const data = await res.json()

        if (data.success && data.data) {
          const d = data.data
          const detalle: UnidadDetalle[] = d.propietariosDetalle ?? []

          // Solo unidades SIN poder asignado aún
          const disponibles = detalle.filter((u: UnidadDetalle) => !u.tienePoder)

          setOtorganteInfo({
            nombreCompleto: d.nombreCompleto,
            cedula: d.cedula,
            esMultiple: detalle.length > 1,
            unidades: disponibles,
          })
          setErrorLookup('')
        } else {
          setOtorganteInfo(null)
          setErrorLookup(data.error ?? 'Propietario no encontrado')
        }
      } catch {
        setOtorganteInfo(null)
        setErrorLookup('Error al buscar el propietario')
      } finally {
        setBuscandoOtorgante(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cedulaOtorgante, asambleaId])

  // ── Helpers de selección ──────────────────────────────────────────────────
  const toggleUnidad = (id: string) => {
    setUnidadesSeleccionadas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodas = () => {
    const disponibles = otorganteInfo?.unidades ?? []
    if (unidadesSeleccionadas.size === disponibles.length) {
      setUnidadesSeleccionadas(new Set())
    } else {
      setUnidadesSeleccionadas(new Set(disponibles.map(u => u.id)))
    }
  }

  const todasSeleccionadas =
    (otorganteInfo?.unidades.length ?? 0) > 0 &&
    unidadesSeleccionadas.size === (otorganteInfo?.unidades.length ?? 0)

  // ── Fetch poderes ─────────────────────────────────────────────────────────
  const fetchPoderes = async (silencioso = false) => {
    silencioso ? setActualizando(true) : setLoading(true)
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

  // ── Paginación / filtrado ─────────────────────────────────────────────────
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

  // ── Limpiar formulario ───────────────────────────────────────────────────
  const limpiarFormulario = () => {
    setCedulaOtorgante('')
    setCedulaApoderado('')
    setNombreApoderado('')
    setOtorganteInfo(null)
    setErrorLookup('')
    setUnidadesSeleccionadas(new Set())
    setErrorForm('')
  }

  // ── Submit nuevo poder ───────────────────────────────────────────────────
  const otorgarPoder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorForm('')

    if (!cedulaOtorgante.trim() || !cedulaApoderado.trim() || !nombreApoderado.trim()) {
      setErrorForm('Completa todos los campos')
      return
    }

    // Si hay múltiples unidades disponibles, debe seleccionar al menos una
    if (otorganteInfo?.esMultiple && otorganteInfo.unidades.length > 0 && unidadesSeleccionadas.size === 0) {
      setErrorForm('Selecciona al menos una unidad para delegar')
      return
    }

    setGuardando(true)

    const body: Record<string, unknown> = {
      asambleaId,
      cedulaOtorgante: cedulaOtorgante.trim(),
      cedulaApoderado: cedulaApoderado.trim(),
      nombreApoderado: nombreApoderado.trim(),
    }

    // Cuando hay selección específica de unidades, enviamos los IDs
    if (otorganteInfo?.esMultiple && unidadesSeleccionadas.size > 0) {
      body.propietarioIds = [...unidadesSeleccionadas]
    }

    try {
      const res = await fetch('/api/poderes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        confirm({
          title: 'Poder(es) Otorgado(s)',
          description: data.message,
          confirmText: 'Aceptar',
          variant: 'success',
          hideCancel: true,
          onConfirm: () => { },
        })
        limpiarFormulario()
        fetchPoderes(true)
      } else {
        confirm({
          title: 'Error al otorgar poder',
          description: data.error || 'Error desconocido.',
          confirmText: 'Aceptar',
          variant: 'destructive',
          hideCancel: true,
          onConfirm: () => { },
        })
      }
    } catch {
      confirm({
        title: 'Error de conexión',
        description: 'No fue posible conectar. Intenta nuevamente.',
        confirmText: 'Aceptar',
        variant: 'destructive',
        hideCancel: true,
        onConfirm: () => { },
      })
    } finally {
      setGuardando(false)
    }
  }

  // ── Edición inline ────────────────────────────────────────────────────────
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
        body: JSON.stringify({ asambleaId, nombreApoderado: editNombre.trim(), cedulaApoderado: editCedula.trim() }),
      })
      const data = await res.json()
      if (data.success) { cancelarEdicion(); fetchPoderes(true) }
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Formulario nuevo poder ── */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          Otorgar Nuevo Poder
        </h3>

        <form onSubmit={otorgarPoder} className="space-y-4">

          {/* Fila 1: datos del formulario */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Cédula otorgante con lookup */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Cédula del otorgante *
              </label>
              <div className="relative">
                <Input
                  placeholder="C.C. del propietario"
                  value={cedulaOtorgante}
                  onChange={(e) => setCedulaOtorgante(e.target.value)}
                  className={errorLookup && !buscandoOtorgante ? 'border-red-300' : ''}
                />
                {buscandoOtorgante && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Nombre encontrado (unidad única) */}
              {otorganteInfo && !otorganteInfo.esMultiple && (
                <p className="mt-1 text-xs text-green-700 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {otorganteInfo.nombreCompleto}
                </p>
              )}

              {/* Nombre encontrado (múltiples unidades) */}
              {otorganteInfo && otorganteInfo.esMultiple && (
                <p className="mt-1 text-xs text-indigo-700 font-medium flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {otorganteInfo.nombreCompleto} · {otorganteInfo.unidades.length} unidad(es) disponible(s)
                </p>
              )}

              {/* Error de lookup */}
              {errorLookup && !buscandoOtorgante && (
                <p className="mt-1 text-xs text-red-600">{errorLookup}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Cédula del apoderado *
              </label>
              <Input
                placeholder="Quien recibirá el poder"
                value={cedulaApoderado}
                onChange={(e) => setCedulaApoderado(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Nombre del apoderado *
              </label>
              <Input
                placeholder="Nombre completo"
                value={nombreApoderado}
                onChange={(e) => setNombreApoderado(e.target.value)}
              />
            </div>
          </div>

          {/* ── Selector de unidades (solo cuando hay múltiples) ── */}
          {otorganteInfo?.esMultiple && (
            <div className="border border-indigo-100 rounded-lg bg-indigo-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-indigo-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Selecciona las unidades a delegar
                </p>
                {otorganteInfo.unidades.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleTodas}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
                  >
                    {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                )}
              </div>

              {otorganteInfo.unidades.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Todas las unidades de este propietario ya tienen poder asignado en esta asamblea.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {otorganteInfo.unidades.map((u) => {
                    const seleccionada = unidadesSeleccionadas.has(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUnidad(u.id)}
                        className={[
                          'flex items-center gap-2 px-3 py-2 rounded-md border text-left text-sm transition-all',
                          seleccionada
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-900 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50',
                        ].join(' ')}
                      >
                        {seleccionada
                          ? <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                          : <Square className="h-4 w-4 text-gray-400 shrink-0" />
                        }
                        <span className="font-medium leading-tight">
                          T·{u.torreManzana}<br />
                          <span className="text-xs font-normal">Apto {u.aptoCasa}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Resumen de selección */}
              {unidadesSeleccionadas.size > 0 && (
                <p className="text-xs text-indigo-600 font-medium pt-1">
                  ✓ {unidadesSeleccionadas.size} unidad(es) seleccionada(s)
                </p>
              )}
            </div>
          )}

          {errorForm && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {errorForm}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {(cedulaOtorgante || cedulaApoderado || nombreApoderado) && (
              <Button type="button" variant="outline" onClick={limpiarFormulario}>
                Limpiar
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                guardando ||
                (otorganteInfo?.esMultiple === true &&
                  otorganteInfo.unidades.length > 0 &&
                  unidadesSeleccionadas.size === 0)
              }
            >
              {guardando ? 'Guardando...' : 'Otorgar Poder'}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Tabla de poderes ── */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">
            Poderes Otorgados{' '}
            <span className="text-sm font-normal text-gray-500">
              ({poderesFiltrados.length}{busqueda ? ` de ${poderes.length}` : ''})
            </span>
            {actualizando && (
              <span className="inline-block h-3 w-3 rounded-full bg-red-400 animate-pulse ml-1" title="Actualizando..." />
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
                            <p className="text-xs text-gray-400">T·{otorgante.torreManzana} · Apto {otorgante.aptoCasa}</p>
                          )}
                        </TableCell>

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