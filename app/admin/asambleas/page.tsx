'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { FormularioAsamblea } from '@/components/admin/FormularioAsamblea'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Asamblea {
  id: string
  tipo: string
  fechaHora: string
  modalidad: string
  estado: string
  quorumInicial: number
  _count: {
    votantes: number
    proposiciones: number
  }
}

export default function AsambleasPage() {
  const router = useRouter()
  const [conjuntoId, setConjuntoId] = useState('')
  const [asambleas, setAsambleas] = useState<Asamblea[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Obtener conjuntoId del admin
      const meResponse = await fetch('/api/auth/me')
      const meData = await meResponse.json()
      
      if (meData.success) {
        setConjuntoId(meData.data.conjuntoId)
        
        // Cargar asambleas
        const asambleasResponse = await fetch(`/api/asambleas?conjuntoId=${meData.data.conjuntoId}`)
        const asambleasData = await asambleasResponse.json()
        
        if (asambleasData.success) {
          setAsambleas(asambleasData.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar asambleas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAsambleaCreada = (asambleaId: string) => {
    setMostrarFormulario(false)
    fetchData()
    router.push(`/admin/asambleas/${asambleaId}`)
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Asambleas</h1>
            <p className="text-gray-600">Gestiona las asambleas del conjunto</p>
          </div>
          <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            <Calendar className="mr-2 h-4 w-4" />
            {mostrarFormulario ? 'Cancelar' : 'Nueva Asamblea'}
          </Button>
        </div>

        {/* Formulario (condicional) */}
        {mostrarFormulario && (
          <div className="mb-8">
            <FormularioAsamblea
              conjuntoId={conjuntoId}
              onCreada={handleAsambleaCreada}
            />
          </div>
        )}

        {/* Lista de Asambleas */}
        {asambleas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay asambleas creadas
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primera asamblea para comenzar
            </p>
            <Button onClick={() => setMostrarFormulario(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Crear Asamblea
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {asambleas.map((asamblea) => (
              <div
                key={asamblea.id}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        asamblea.estado === 'activa' ? 'bg-green-100 text-green-800' :
                        asamblea.estado === 'finalizada' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {asamblea.estado.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600 capitalize">
                        {asamblea.tipo}
                      </span>
                      <span className="text-sm text-gray-600 capitalize">
                        • {asamblea.modalidad}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Asamblea {asamblea.tipo} - {format(new Date(asamblea.fechaHora), "d 'de' MMMM yyyy", { locale: es })}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {format(new Date(asamblea.fechaHora), "h:mm a", { locale: es })}
                    </p>

                    <div className="flex gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{asamblea._count.votantes} votantes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{asamblea._count.proposiciones} proposiciones</span>
                      </div>
                      {asamblea.quorumInicial > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            Quórum: {asamblea.quorumInicial.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => router.push(`/admin/asambleas/${asamblea.id}`)}
                    variant="outline"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalle
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