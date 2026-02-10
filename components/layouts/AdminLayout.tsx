'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { LogoImage } from '@/components/ui/logo'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface AdminData {
  nombre: string
  email: string
  conjuntoNombre: string
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(null)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setAdmin(data.data)
      }
    } catch (error) {
      console.error('Error al obtener datos del admin:', error)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y nombre del conjunto */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
              >
                {/* Logo */}
                <LogoImage size="md" variant='light'/>
                
                {/* Separador */}
                {admin && (
                  <>
                    <div className="h-8 w-px bg-gray-300" />
                    
                    {/* Nombre del conjunto */}
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
            </div>

            {/* User info y logout */}
            <div className="flex items-center gap-4">
              {admin && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {admin.nombre}
                  </p>
                  <p className="text-xs text-gray-500">{admin.email}</p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}