'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

const PAGE_SIZE = 8

interface GestionPoderesProps {
  asambleaId: string
}

export function GestionPoderes({ asambleaId }: GestionPoderesProps) {
  const [poderes, setPoderes] = useState<any[]>([])
  const [cedulaOtorgante, setCedulaOtorgante] = useState('')
  const [cedulaApoderado, setCedulaApoderado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const { confirm, Dialog } = useConfirmDialog()

  useEffect(() => {
    fetchPoderes()
  }, [asambleaId])

  // Resetear paginación cuando cambia la búsqueda
  useEffect(() => {
    setPagina(1)
  }, [busqueda])

  const fetchPoderes = async () => {
    try {
      const response = await fetch(`/api/poderes?asambleaId=${asambleaId}`)
      const data = await response.json()
      if (data.success) {
        setPoderes(data.data)
      }
    } catch (error) {
      console.error('Error al cargar poderes:', error)
    }
  }

  const otorgarPoder = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const response = await fetch('/api/poderes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId,
          cedulaOtorgante,
          cedulaApoderado,
          nombreApoderado,
        }),
      })

      const data = await response.json()

      if (data.success) {
        confirm({
          title: 'Poder Otorgado',
          description: `El poder fue otorgado exitosamente a ${nombreApoderado}.`,
          confirmText: 'Aceptar',
          variant: 'success',
          hideCancel: true,
          onConfirm: () => { },
        })
        setCedulaOtorgante('')
        setCedulaApoderado('')
        setNombreApoderado('')
        fetchPoderes()
      } else {
        confirm({
          title: 'Error al otorgar poder',
          description: data.error || 'Ocurrió un error al otorgar poder.',
          confirmText: 'Aceptar',
          variant: 'destructive',
          hideCancel: true,
          onConfirm: () => { },
        })
      }
    } catch (error) {
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

  // Filtrado por búsqueda 
  const poderesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return poderes
    return poderes.filter((p) => {
      const otorgante = p.propietarioOtorgante ?? p.otorgante
      return (
        otorgante?.nombreCompleto?.toLowerCase().includes(q) ||
        otorgante?.cedula?.toLowerCase().includes(q) ||
        p.nombreApoderado?.toLowerCase().includes(q) ||
        p.cedulaApoderado?.toLowerCase().includes(q)
      )
    })
  }, [poderes, busqueda])

  //  Paginación 
  const totalPaginas = Math.max(1, Math.ceil(poderesFiltrados.length / PAGE_SIZE))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const poderesPagina = poderesFiltrados.slice(
    (paginaSegura - 1) * PAGE_SIZE,
    paginaSegura * PAGE_SIZE
  )

  return (
    <div className="space-y-6">
      {/*  Formulario  */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          Registrar Poder
        </h3>
        <form onSubmit={otorgarPoder} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cédula Otorgante
            </label>
            <Input
              placeholder="Ej: 12345678"
              value={cedulaOtorgante}
              onChange={(e) => setCedulaOtorgante(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cédula Apoderado
            </label>
            <Input
              placeholder="Ej: 87654321"
              value={cedulaApoderado}
              onChange={(e) => setCedulaApoderado(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre Apoderado
            </label>
            <Input
              placeholder="Nombre completo"
              value={nombreApoderado}
              onChange={(e) => setNombreApoderado(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={guardando}>
              <UserPlus className="mr-2 h-4 w-4" />
              {guardando ? 'Guardando...' : 'Otorgar Poder'}
            </Button>
          </div>
        </form>
      </div>

      {/*  Tabla de poderes  */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Header con contador y buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">
            Poderes Otorgados{' '}
            <span className="text-sm font-normal text-gray-500">
              ({poderesFiltrados.length}{busqueda ? ` de ${poderes.length}` : ''})
            </span>
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

        {poderes.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            No hay poderes otorgados para esta asamblea
          </p>
        ) : poderesFiltrados.length === 0 ? (
          <p className="text-center text-gray-400 py-10">
            No se encontraron poderes con "{busqueda}"
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center text-gray-500">#</TableHead>
                  <TableHead>Otorgante</TableHead>
                  <TableHead>Apoderado</TableHead>
                  <TableHead className="text-right">Coeficiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poderesPagina.map((poder, idx) => {
                  const otorgante = poder.propietarioOtorgante ?? poder.otorgante
                  const numFila = (paginaSegura - 1) * PAGE_SIZE + idx + 1
                  return (
                    <TableRow key={poder.id}>
                      <TableCell className="text-center text-gray-400 text-sm">
                        {numFila}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {otorgante?.nombreCompleto}
                          </p>
                          <p className="text-xs text-gray-500">
                            CC: {otorgante?.cedula}
                          </p>
                          {otorgante?.torreManzana && (
                            <p className="text-xs text-gray-400">
                              {otorgante.torreManzana} {otorgante.aptoCasa}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {poder.nombreApoderado}
                          </p>
                          <p className="text-xs text-gray-500">
                            CC: {poder.cedulaApoderado}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-indigo-700">
                        {Number(otorgante?.coeficiente).toFixed(4)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Activo
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Paginador */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Página {paginaSegura} de {totalPaginas} · {poderesFiltrados.length} poderes
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaSegura === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Números de página */}
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(
                      (n) =>
                        n === 1 ||
                        n === totalPaginas ||
                        Math.abs(n - paginaSegura) <= 1
                    )
                    .reduce<(number | string)[]>((acc, n, i, arr) => {
                      if (i > 0 && (n as number) - (arr[i - 1] as number) > 1)
                        acc.push('…')
                      acc.push(n)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={item === paginaSegura ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPagina(item as number)}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          {item}
                        </Button>
                      )
                    )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaSegura === totalPaginas}
                    className="h-8 w-8 p-0"
                  >
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