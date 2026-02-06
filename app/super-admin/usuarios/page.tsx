'use client'

import { useEffect, useState } from 'react'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Building2,
  Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AdminConConjunto {
  id: string
  nombre: string
  email: string
  activo: boolean
  createdAt: string
  conjunto: {
    nombre: string
    nit: string
  }
}

export default function UsuariosPage() {
  const [admins, setAdmins] = useState<AdminConConjunto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/super/conjuntos')
      const data = await response.json()
      
      if (data.success) {
        // Extraer admins de los conjuntos
        const todosAdmins = data.data
          .filter((c: any) => c.admin)
          .map((c: any) => ({
            id: c.admin.id,
            nombre: c.admin.nombre,
            email: c.admin.email,
            activo: c.admin.activo,
            createdAt: c.admin.createdAt || c.createdAt || new Date().toISOString(), // FALLBACK
            conjunto: {
              nombre: c.nombre,
              nit: c.nit,
            },
          }))
        
        setAdmins(todosAdmins)
      }
    } catch (error) {
      console.error('Error al cargar admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const adminsFiltrados = admins.filter(admin =>
    admin.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    admin.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    admin.conjunto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Administradores de Conjuntos
          </h1>
          <p className="text-slate-600">
            Gestiona todos los administradores del sistema
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Admins</p>
                <p className="text-2xl font-bold text-slate-900">
                  {admins.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {admins.filter(a => a.activo).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Inactivos</p>
                <p className="text-2xl font-bold text-red-600">
                  {admins.filter(a => !a.activo).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o conjunto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de Administradores */}
        {adminsFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {busqueda ? 'No se encontraron resultados' : 'No hay administradores registrados'}
            </h3>
            <p className="text-slate-600">
              {busqueda 
                ? 'Intenta con otro término de búsqueda'
                : 'Crea administradores desde la página de cada conjunto'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Administrador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Conjunto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Creado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {adminsFiltrados.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {admin.nombre}
                        </div>
                        <div className="text-sm text-slate-500">
                          {admin.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-sm text-slate-900">
                            {admin.conjunto.nombre}
                          </div>
                          <div className="text-xs text-slate-500">
                            {admin.conjunto.nit}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        admin.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {(() => {
                        try {
                          const fecha = new Date(admin.createdAt)
                          if (isNaN(fecha.getTime())) {
                            return 'Fecha no disponible'
                          }
                          return format(fecha, "d MMM yyyy", { locale: es })
                        } catch (error) {
                          return 'Fecha inválida'
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}