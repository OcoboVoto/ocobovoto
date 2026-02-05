'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Shield, Building2, Users } from 'lucide-react'
import { ConfirmDialog } from '../ui/confirm-dialog'

interface SuperAdminLayoutProps {
    children: React.ReactNode
}

interface SuperAdminData {
    nombre: string
    email: string
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
    const router = useRouter()
    const [admin, setAdmin] = useState<SuperAdminData | null>(null)


    useEffect(() => {
        // Obtener datos de la cookie (ya validada por middleware)
        const fetchAdminData = () => {
            // Por simplicidad, lo sacamos de la cookie en el cliente
            const cookies = document.cookie.split('; ')
            const sessionCookie = cookies.find(c => c.startsWith('super-admin-session='))

            if (sessionCookie) {
                try {
                    const data = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]))
                    setAdmin(data)
                } catch (error) {
                    console.error('Error al parsear cookie:', error)
                }
            }
        }

        fetchAdminData()
    }, [])

    const handleLogout = async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.push('/super-login')
          router.refresh()
        } catch (error) {
          console.error('Error al cerrar sesión:', error)
        }
      }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg">
                                    <Shield className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        OcoboVoto - Super Admin
                                    </h1>
                                    <p className="text-xs text-slate-400">
                                        Panel de control maestro
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {admin && (
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">
                                        {admin.nombre}
                                    </p>
                                    <p className="text-xs text-slate-400">{admin.email}</p>
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="border-slate-700 text-red hover:bg-slate-800"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1">
                        <button
                            onClick={() => router.push('/super-admin/dashboard')}
                            className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-b-2 border-transparent hover:border-slate-900 transition-colors flex items-center gap-2"
                        >
                            <Building2 className="h-4 w-4" />
                            Conjuntos
                        </button>
                        <button
                            onClick={() => router.push('/super-admin/usuarios')}
                            className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-b-2 border-transparent hover:border-slate-900 transition-colors flex items-center gap-2"
                        >
                            <Users className="h-4 w-4" />
                            Administradores
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>{children}</main>
        </div>
    )
}