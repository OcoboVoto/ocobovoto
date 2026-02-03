'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { Button } from '@/components/ui/button'
import { FileText, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Asamblea {
  id: string
  tipo: string
  fechaHora: string
  estado: string
  quorumInicial: number
  _count: {
    proposiciones: number
  }
}

export default function ReportesPage() {
  const router = useRouter()
  const [asambleas, setAsambleas] = useState<Asamblea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAsambleas()
  }, [])

  const fetchAsambleas = async () => {
    try {
      const meResponse = await fetch('/api/auth/me')
      const meData = await meResponse.json()
      
      if (meData.success) {
        const response = await fetch(`/api/asambleas?conjuntoId=${meData.data.conjuntoId}`)
        const data = await response.json()
        
        if (data.success) {
          // Filtrar solo finalizadas
          const finalizadas = data.data.filter((a: Asamblea) => a.estado === 'finalizada')
          setAsambleas(finalizadas)
        }
      }
    } catch (error) {
      console.error('Error al cargar asambleas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes</h1>
          <p className="text-gray-600">
            Consulta las actas de asambleas finalizadas
          </p>
        </div>

        {asambleas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay reportes disponibles
            </h3>
            <p className="text-gray-600">
              Los reportes aparecerán aquí cuando finalices una asamblea
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {asambleas.map((asamblea) => (
              <div
                key={asamblea.id}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 capitalize">
                      Asamblea {asamblea.tipo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {format(new Date(asamblea.fechaHora), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Quórum: {asamblea.quorumInicial.toFixed(1)}%</span>
                      <span>•</span>
                      <span>{asamblea._count.proposiciones} proposiciones</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => router.push(`/admin/reportes/${asamblea.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Reporte
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}