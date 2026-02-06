'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Calendar, 
  Edit,
  Save,
  X,
  UserPlus
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ConjuntoConAdmin } from '@/types'

export default function DetalleConjuntoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [conjunto, setConjunto] = useState<ConjuntoConAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Form states
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [coeficienteTotal, setCoeficienteTotal] = useState('')

  useEffect(() => {
    fetchConjunto()
  }, [id])

  const fetchConjunto = async () => {
    try {
      const response = await fetch('/api/super/conjuntos')
      const data = await response.json()
      
      if (data.success) {
        const conj = data.data.find((c: ConjuntoConAdmin) => c.id === id)
        if (conj) {
          setConjunto(conj)
          setNombre(conj.nombre)
          setNit(conj.nit)
          setCoeficienteTotal(conj.coeficienteTotal.toString())
        }
      }
    } catch (error) {
      console.error('Error al cargar conjunto:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    setGuardando(true)

    try {
      const response = await fetch(`/api/super/conjuntos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          nit,
          coeficienteTotal: parseFloat(coeficienteTotal),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Conjunto actualizado exitosamente')
        setEditando(false)
        fetchConjunto()
      } else {
        alert('❌ ' + data.error)
      }
    } catch (error) {
      alert('❌ Error al actualizar conjunto')
    } finally {
      setGuardando(false)
    }
  }

  const toggleEstadoAdmin = async () => {
    if (!conjunto?.admin) return

    const nuevoEstado = !conjunto.admin.activo

    try {
      const response = await fetch(`/api/super/admins/${conjunto.admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Administrador ${nuevoEstado ? 'activado' : 'desactivado'}`)
        fetchConjunto()
      } else {
        alert('❌ ' + data.error)
      }
    } catch (error) {
      alert('❌ Error al cambiar estado')
    }
  }

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </SuperAdminLayout>
    )
  }

  if (!conjunto) {
    return (
      <SuperAdminLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-red-600">Conjunto no encontrado</p>
        </div>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/super-admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                {editando ? (
                  <div className="space-y-2">
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="text-2xl font-bold"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {conjunto.nombre}
                    </h1>
                    <p className="text-slate-600 mt-1">NIT: {conjunto.nit}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!editando ? (
                <Button
                  onClick={() => setEditando(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setEditando(false)
                      setNombre(conjunto.nombre)
                      setNit(conjunto.nit)
                      setCoeficienteTotal(conjunto.coeficienteTotal.toString())
                    }}
                    variant="outline"
                    size="sm"
                    disabled={guardando}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardar}
                    size="sm"
                    disabled={guardando}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {editando && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  NIT
                </label>
                <Input
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Coeficiente Total
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={coeficienteTotal}
                  onChange={(e) => setCoeficienteTotal(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                {conjunto._count.asambleas}
              </p>
              <p className="text-sm text-slate-600">Asambleas</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                {conjunto._count.propietarios}
              </p>
              <p className="text-sm text-slate-600">Propietarios</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                {conjunto.coeficienteTotal}%
              </p>
              <p className="text-sm text-slate-600">Coeficiente Total</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Creado el {format(new Date(conjunto.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Administrador */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Administrador</h2>
            {!conjunto.admin && (
              <Button
                onClick={() => router.push(`/super-admin/conjuntos/${id}/crear-admin`)}
                size="sm"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Administrador
              </Button>
            )}
          </div>

          {conjunto.admin ? (
            <div>
              <div className="bg-slate-50 rounded-lg p-6 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {conjunto.admin.nombre}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        conjunto.admin.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {conjunto.admin.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-1">
                      <strong>Email:</strong> {conjunto.admin.email}
                    </p>
                    <p className="text-slate-600 text-sm">
                      <strong>ID:</strong> {conjunto.admin.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={toggleEstadoAdmin}
                  variant="outline"
                  className="flex-1"
                >
                  {conjunto.admin.activo ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Desactivar Administrador
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Activar Administrador
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                Este conjunto aún no tiene un administrador asignado
              </p>
              <Button onClick={() => router.push(`/super-admin/conjuntos/${id}/crear-admin`)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Administrador
              </Button>
            </div>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button
            onClick={() => router.push(`/super-admin/conjuntos/${id}/asambleas`)}
            variant="outline"
            className="h-20"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Ver Asambleas
          </Button>
          <Button
            onClick={() => router.push(`/admin/propietarios`)}
            variant="outline"
            className="h-20"
          >
            <Users className="mr-2 h-5 w-5" />
            Gestionar Propietarios
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  )
}