'use client'

import { useEffect, useState } from 'react'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Input } from '@/components/ui/input'
import {
  Users, Search, CheckCircle, XCircle, Building2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ConjuntoSimple {
  id: string
  nombre: string
  nit: string
}

interface Admin {
  id: string
  nombre: string
  email: string
  activo: boolean
  createdAt: string
  conjunto: ConjuntoSimple[]  // ← ahora es array
}

export default function UsuariosPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/super/admins')
      const data = await response.json()
      if (data.success) setAdmins(data.data)
    } catch (error) {
      console.error('Error al cargar admins:', error)
    } finally {
      setLoading(false)
    }
  }

  // Ahora la búsqueda busca dentro del array de conjuntos
  const adminsFiltrados = admins.filter(admin => {
    const termino = busqueda.toLowerCase()
    const coincideNombre = admin.nombre.toLowerCase().includes(termino)
    const coincideEmail = admin.email.toLowerCase().includes(termino)
    const coincideConjunto = admin.conjunto.some(c =>
      c.nombre.toLowerCase().includes(termino)
    )
    return coincideNombre || coincideEmail || coincideConjunto
  })

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
                <p className="text-2xl font-bold text-slate-900">{admins.length}</p>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o conjunto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabla */}
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
                    Conjuntos asignados
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

                    {/* Nombre + email */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{admin.nombre}</div>
                      <div className="text-sm text-slate-500">{admin.email}</div>
                    </td>

                    {/* Conjuntos: ahora puede ser 0, 1 o varios */}
                    <td className="px-6 py-4">
                      {admin.conjunto.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Sin conjuntos asignados</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {admin.conjunto.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              <div>
                                <div className="text-sm text-slate-900">{c.nombre}</div>
                                <div className="text-xs text-slate-500">{c.nit}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {admin.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Fecha */}
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