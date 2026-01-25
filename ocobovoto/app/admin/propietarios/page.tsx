'use client'

import { useEffect, useState } from 'react'
import { EditorPropietarios } from '@/components/admin/EditorPropietarios'
import { AdminLayout } from '@/components/layouts/AdminLayout'

export default function PropietariosPage() {
  const [conjuntoId, setConjuntoId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConjuntoId()
  }, [])

  const fetchConjuntoId = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.success) {
        setConjuntoId(data.data.conjuntoId)
      }
    } catch (error) {
      console.error('Error al obtener conjunto:', error)
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Propietarios
          </h1>
          <p className="text-gray-600">
            Carga y edita la lista de propietarios del conjunto
          </p>
        </div>

        <EditorPropietarios
          conjuntoId={conjuntoId}
          onGuardadoExitoso={(count) => {
            console.log(`✅ ${count} propietarios guardados`)
          }}
        />
      </div>
    </AdminLayout>
  )
}