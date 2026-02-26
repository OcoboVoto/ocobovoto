'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, ArrowLeftRight } from 'lucide-react'
import { LogoImage } from '@/components/ui/logo'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface AdminData {
  id: string
  nombre: string
  email: string
  conjuntoId: string
  conjuntoNombre: string
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [tieneMasConjuntos, setTieneMasConjuntos] = useState(false)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setAdmin(data.data)
        // Verificar si este admin tiene más de 1 conjunto
        verificarConjuntos(data.data.id)
      }
    } catch (error) {
      console.error('Error al obtener datos del admin:', error)
    }
  }

  const verificarConjuntos = async (adminId: string) => {
    try {
      const res = await fetch(`/api/auth/mis-conjuntos`)
      const data = await res.json()
      if (data.success && data.data.length > 1) {
        setTieneMasConjuntos(true)
      }
    } catch {
      // silencioso, no es crítico
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

  // Cierra sesión y vuelve al login para elegir otro conjunto
  const handleCambiarConjunto = async () => {
    try {
      await fetch('/api/auth/cambiar-conjunto', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error al cambiar conjunto:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">

            {/* Logo y nombre del conjunto */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
              >
                <LogoImage size="md" variant='light' />

                {admin && (
                  <>
                    <div className="h-8 w-px bg-gray-300" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        Conjunto
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {admin.conjuntoNombre}
                      </span>
                    </div>
                  </>
                )}
              </button>

              {/* Botón cambiar conjunto — solo si tiene más de 1 */}
              {tieneMasConjuntos && (
                <button
                  onClick={handleCambiarConjunto}
                  title="Cambiar de conjunto"
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-md px-2 py-1 transition-colors"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cambiar conjunto</span>
                </button>
              )}
            </div>

            {/* Área derecha — usuario + logout */}
            <div className="flex items-center gap-4">
              {admin && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{admin.nombre}</p>
                  <p className="text-xs text-gray-500">{admin.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Salir</span>
              </Button>
            </div>

          </div>
        </div>
      </header>

      {children}
    </div>
  )
}