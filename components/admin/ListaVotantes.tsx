// components/admin/ListaVotantes.tsx

'use client'

import { useMemo, useState } from 'react'
import { Users, AlertTriangle, ChevronLeft, ChevronRight, Search, Trash2, X } from 'lucide-react'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table'

interface Votante {
  id: string
  cedula: string
  nombreCompleto: string
  coeficienteTotal: number
  propietariosRepresenta: number
  createdAt: string
}

interface ListaVotantesProps {
  asambleaId: string
  votantes: Votante[]
  onVotanteAnulado?: () => void
  estadoAsamblea?: string
}

const ITEMS_POR_PAGINA = 10

export function ListaVotantes({
  asambleaId,
  votantes,
  onVotanteAnulado,
  estadoAsamblea = 'activa',
}: ListaVotantesProps) {
  const [busqueda, setBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const [anulando, setAnulando] = useState<string | null>(null)
  const { confirm, Dialog } = useConfirmDialog()

  const votantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return votantes
    return votantes.filter(
      (v) =>
        v.nombreCompleto.toLowerCase().includes(q) ||
        v.cedula.includes(q)
    )
  }, [votantes, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(votantesFiltrados.length / ITEMS_POR_PAGINA))
  const paginaSegura = Math.min(paginaActual, totalPaginas)
  const votantesPagina = votantesFiltrados.slice(
    (paginaSegura - 1) * ITEMS_POR_PAGINA,
    paginaSegura * ITEMS_POR_PAGINA
  )

  const handleBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPaginaActual(1)
  }

  const handleAnular = (votante: Votante) => {
    confirm({
      title: '¿Anular registro?',
      description: `Se eliminará el registro de "${votante.nombreCompleto}" (CC: ${votante.cedula}) y se recalculará el quórum. Esta acción no se puede deshacer si el votante ya emitió votos.`,
      confirmText: 'Sí, anular',
      cancelText: 'Cancelar',
      variant: 'destructive',
      onConfirm: async () => {
        setAnulando(votante.id)
        try {
          const res = await fetch(
            `/api/asambleas/${asambleaId}/votantes/${votante.id}`,
            { method: 'DELETE' }
          )
          const data = await res.json()

          if (data.success) {
            confirm({
              title: 'Registro anulado',
              description: data.message,
              confirmText: 'Aceptar',
              variant: 'success',
              hideCancel: true,
              onConfirm: () => { onVotanteAnulado?.() },
            })
          } else {
            confirm({
              title: 'No se pudo anular',
              description: data.error,
              confirmText: 'Entendido',
              variant: 'destructive',
              hideCancel: true,
              onConfirm: () => { },
            })
          }
        } catch {
          confirm({
            title: 'Error de conexión',
            description: 'No fue posible anular el registro. Intenta nuevamente.',
            confirmText: 'Aceptar',
            variant: 'destructive',
            hideCancel: true,
            onConfirm: () => { },
          })
        } finally {
          setAnulando(null)
        }
      },
    })
  }

  const puedeAnular = estadoAsamblea !== 'finalizada'

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Votantes Registrados</h3>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              {votantes.length} registrados
            </span>
          </div>

          {votantes.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Buscar por nombre o cédula…"
                value={busqueda}
                onChange={(e) => handleBusqueda(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {busqueda && (
                <button
                  onClick={() => handleBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {busqueda && (
          <p className="text-xs text-gray-500 mt-2">
            Mostrando {votantesFiltrados.length} de {votantes.length} votante(s)
          </p>
        )}
      </div>

      {puedeAnular && votantes.length > 0 && (
        <div className="flex items-start gap-2 mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            Puedes anular un registro si el propietario se registró sin sus poderes. Tras la anulación,
            agrega los poderes y vuelve a registrarlo para que el coeficiente sea correcto.
          </span>
        </div>
      )}

      {votantes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Aún no hay votantes registrados</p>
          <p className="text-xs mt-1">Los registros aparecerán aquí en tiempo real</p>
        </div>
      ) : votantesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Sin resultados para "{busqueda}"</p>
          <button className="text-xs text-indigo-500 mt-1 hover:underline" onClick={() => handleBusqueda('')}>
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-gray-400">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead className="text-right">Coeficiente</TableHead>
                  <TableHead className="text-center">Representa</TableHead>
                  <TableHead className="text-center">Hora</TableHead>
                  {puedeAnular && (
                    <TableHead className="w-20 text-center">Anular</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {votantesPagina.map((votante, idx) => {
                  const numFila = (paginaSegura - 1) * ITEMS_POR_PAGINA + idx + 1
                  const estaAnulando = anulando === votante.id
                  return (
                    <TableRow key={votante.id} className={estaAnulando ? 'opacity-50' : ''}>
                      <TableCell className="text-center text-gray-400 text-sm">{numFila}</TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{votante.nombreCompleto}</p>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{votante.cedula}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-700">
                        {Number(votante.coeficienteTotal).toFixed(4)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {votante.propietariosRepresenta}{' '}
                          {votante.propietariosRepresenta === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-500 text-xs">
                        {new Date(votante.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      {puedeAnular && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={estaAnulando}
                            onClick={() => handleAnular(votante)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Anular registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-500">
                Página {paginaSegura} de {totalPaginas} · {votantesFiltrados.length} resultado(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={paginaSegura <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {Dialog}
    </div>
  )
}