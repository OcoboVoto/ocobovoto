'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileText, LogOut, Settings } from 'lucide-react'
import { AdminLayout } from '@/components/layouts/AdminLayout'

interface AdminData {
  id: string
  email: string
  nombre: string
  conjuntoId: string
  conjuntoNombre: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setAdmin(data.data)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error al obtener datos del admin:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AdminLayout>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Bienvenido de nuevo!
            </h2>
            <p className="text-gray-600">
              Gestiona las asambleas y votaciones de tu conjunto residencial
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Propietarios Card */}
            <button
              onClick={() => router.push('/admin/propietarios')}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 text-left border border-gray-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Propietarios
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Gestiona la lista de propietarios del conjunto
              </p>
              <span className="text-sm text-blue-600 font-medium">
                Ir a Propietarios →
              </span>
            </button>

            {/* Asambleas Card */}
            <button
              onClick={() => router.push('/admin/asambleas')}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 text-left border border-gray-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Asambleas
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Crea y gestiona asambleas del conjunto
              </p>
              <span className="text-sm text-green-600 font-medium">
                Ir a Asambleas →
              </span>
            </button>

            {/* Reportes Card */}
            <button
              onClick={() => router.push('/admin/reportes')}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 text-left border border-gray-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reportes
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Consulta reportes y actas de asambleas
              </p>
              <span className="text-sm text-purple-600 font-medium">
                Ir a Reportes →
              </span>
            </button>
          </div>

          {/* Stats Section 
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Estadísticas Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Propietarios</p>
              <p className="text-3xl font-bold text-gray-900">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Asambleas Activas</p>
              <p className="text-3xl font-bold text-green-600">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Próxima Asamblea</p>
              <p className="text-sm font-medium text-gray-900">--</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Coeficiente Total</p>
              <p className="text-2xl font-bold text-gray-900">100%</p>
            </div>
          </div>
        </div>
        */}
        </main>
      </AdminLayout>
    </div>
  )

}