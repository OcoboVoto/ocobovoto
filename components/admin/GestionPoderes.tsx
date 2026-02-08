'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

interface GestionPoderesProps {
  asambleaId: string
}

export function GestionPoderes({ asambleaId }: GestionPoderesProps) {
  const [poderes, setPoderes] = useState<any[]>([])
  const [cedulaOtorgante, setCedulaOtorgante] = useState('')
  const [cedulaApoderado, setCedulaApoderado] = useState('')
  const [nombreApoderado, setNombreApoderado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { confirm, Dialog } = useConfirmDialog()

  useEffect(() => {
    fetchPoderes()
  }, [asambleaId])

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
          title: 'Error otorgar poderes.',
          description: data.error || 'Ocurrió un error al otorgar poderes.',
          confirmText: 'Aceptar',
          variant: 'destructive',
          hideCancel: true,
          onConfirm: () => { },
        })
      }
    } catch (error) {
      confirm({
        title: 'Error de conexión',
        description: 'No fue posible enviar el correo. Intenta nuevamente.',
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Otorgar Poder</h3>

        <form onSubmit={otorgarPoder} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Cédula Otorgante
              </label>
              <Input
                value={cedulaOtorgante}
                onChange={(e) => setCedulaOtorgante(e.target.value)}
                placeholder="1111111111"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Quien NO va a asistir
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Cédula Apoderado
              </label>
              <Input
                value={cedulaApoderado}
                onChange={(e) => setCedulaApoderado(e.target.value)}
                placeholder="2222222222"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Quien SÍ va a asistir
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre Apoderado
              </label>
              <Input
                value={nombreApoderado}
                onChange={(e) => setNombreApoderado(e.target.value)}
                placeholder="María Apoderada"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={guardando}>
            <UserPlus className="mr-2 h-4 w-4" />
            {guardando ? 'Guardando...' : 'Otorgar Poder'}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">
          Poderes Otorgados ({poderes.length})
        </h3>

        {poderes.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay poderes otorgados para esta asamblea
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Otorgante</TableHead>
                <TableHead>Apoderado</TableHead>
                <TableHead>Coeficiente</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poderes.map((poder) => (
                <TableRow key={poder.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {poder.propietarioOtorgante.nombreCompleto}
                      </p>
                      <p className="text-sm text-gray-500">
                        CC: {poder.propietarioOtorgante.cedula}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{poder.nombreApoderado}</p>
                      <p className="text-sm text-gray-500">
                        CC: {poder.cedulaApoderado}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {Number(poder.propietarioOtorgante.coeficiente).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Activo
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {Dialog}
    </div>
  )
}