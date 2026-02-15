//app/admin/propietarios/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditorPropietarios } from '@/components/admin/EditorPropietarios'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { ListaPropietarios } from '@/components/admin/ListaPropietarios'
import { Users } from 'lucide-react'

export default function PropietariosPage() {
  const [conjuntoId, setConjuntoId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [propietarios, setPropietarios] = useState([])

  useEffect(() => {
    fetchConjuntoId()
  }, [])

  useEffect(() => {
    if (conjuntoId) {
      fetchPropietarios(conjuntoId)
    }
  }, [conjuntoId])

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

  const fetchPropietarios = async (id: string) => {
    try {
      const response = await fetch(`/api/propietarios/cargueMasivo?conjuntoId=${id}`)
      const data = await response.json()
      if (data.success) {
        setPropietarios(data.data)
      }
    } catch (error) {
      console.error('Error al cargar propietarios:', error)
    }
  }

  const fetchPropietariosByConjunto = useCallback(() => {
    if (!conjuntoId) return
    fetchPropietarios(conjuntoId)
  }, [conjuntoId])

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

        {/* Editor para cargar nuevos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cargar Nuevos Propietarios
          </h2>
          <EditorPropietarios
            conjuntoId={conjuntoId}
            onGuardadoExitoso={fetchPropietariosByConjunto}
          />
        </div>

        {/* Lista de propietarios existentes */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Propietarios Registrados ({propietarios.length})
          </h2>
          <ListaPropietarios
            propietarios={propietarios}
            onActualizar={fetchPropietariosByConjunto} />
        </div>
      </div>
    </AdminLayout>
  )
}