'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck } from 'lucide-react'

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
}

export function ListaVotantes({ asambleaId, votantes }: ListaVotantesProps) {
  /*const [votantes, setVotantes] = useState<Votante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVotantes()
    
    // Polling cada 5 segundos para actualizar
    const interval = setInterval(fetchVotantes, 5000)
    
    return () => clearInterval(interval)
  }, [asambleaId])

  const fetchVotantes = async () => {
    try {
      const response = await fetch(`/api/asambleas/${asambleaId}`)
      const data = await response.json()
      
      if (data.success && data.data.votantes) {
        setVotantes(data.data.votantes)
      }
    } catch (error) {
      console.error('Error al cargar votantes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
*/
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Votantes Registrados</h3>
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
            {votantes.length} registrados
          </span>
        </div>
      </div>

      {votantes.length === 0 ? (
        <div className="p-12 text-center">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            No hay votantes registrados aún
          </p>
        </div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {votantes.map((votante) => (
            <div key={votante.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {votante.nombreCompleto}
                  </p>
                  <p className="text-sm text-gray-600">
                    CC: {votante.cedula}
                  </p>
                  {votante.propietariosRepresenta > 1 && (
                    <p className="text-xs text-indigo-600 mt-1">
                      Representa {votante.propietariosRepresenta} propietarios
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {Number(votante.coeficienteTotal).toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    coeficiente
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}