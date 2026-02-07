'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, FileText, Download, Send } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'

interface Asamblea {
  id: string
  tipo: string
  fechaHora: string
  estado: string
  quorumInicial: number
  quorumFinal: number | null
  _count: {
    proposiciones: number
    votantes: number
  }
}

interface Conjunto {
  id: string
  nombre: string
  nit: string
  admin?: {
    email: string
  }
}

export default function AsambleasConjuntoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [asambleas, setAsambleas] = useState<Asamblea[]>([])
  const [loading, setLoading] = useState(true)
  const [enviandoEmail, setEnviandoEmail] = useState<string | null>(null)
  const [mostrarModalEmail, setMostrarModalEmail] = useState(false)
  const [asambleaSeleccionada, setAsambleaSeleccionada] = useState<string | null>(null)
  const [emailDestino, setEmailDestino] = useState('')
  const { confirm, Dialog } = useConfirmDialog()

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      // Obtener conjunto
      const conjResponse = await fetch('/api/super/conjuntos')
      const conjData = await conjResponse.json()

      if (conjData.success) {
        const conj = conjData.data.find((c: any) => c.id === id)
        if (conj) {
          setConjunto({
            id: conj.id,
            nombre: conj.nombre,
            nit: conj.nit,
            admin: conj.admin,
          })
        }
      }

      // Obtener asambleas
      const asamResponse = await fetch(`/api/asambleas?conjuntoId=${id}`)
      const asamData = await asamResponse.json()

      if (asamData.success) {
        setAsambleas(asamData.data)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = (asambleaId: string) => {
    // Abrir en nueva pestaña para imprimir/descargar
    window.open(`/admin/reportes/${asambleaId}`, '_blank')
  }

  const abrirModalEmail = (asambleaId: string) => {
    setAsambleaSeleccionada(asambleaId)
    if (conjunto?.admin?.email) {
      setEmailDestino(conjunto.admin.email)
    }

    setMostrarModalEmail(true)
  }

  const enviarEmail = async () => {
    if (!asambleaSeleccionada || !emailDestino) return

    setEnviandoEmail(asambleaSeleccionada)

    try {
      const response = await fetch('/api/super/enviar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId: asambleaSeleccionada,
          emailDestino,
        }),
      })

      const data = await response.json()

      if (data.success) {
        confirm({
          title: 'Correo enviado',
          description: `El reporte fue enviado exitosamente a ${emailDestino}.`,
          confirmText: 'Aceptar',
          variant: 'success',
          hideCancel: true,
          onConfirm: () => {},
        })
        setMostrarModalEmail(false)
        setEmailDestino('')
      } else {
        confirm({
          title: 'Error al enviar correo',
          description: data.error || 'Ocurrió un error al enviar el reporte.',
          confirmText: 'Aceptar',
          variant: 'destructive',
          hideCancel: true,
          onConfirm: () => {},
        })
      }
    } catch (error) {
      confirm({
        title: 'Error de conexión',
        description: 'No fue posible enviar el correo. Intenta nuevamente.',
        confirmText: 'Aceptar',
        variant: 'destructive',
        hideCancel: true,
        onConfirm: () => {},
      })
    } finally {
      setEnviandoEmail(null)
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/super-admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Asambleas - {conjunto.nombre}
          </h1>
          <p className="text-slate-600">
            NIT: {conjunto.nit}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Total Asambleas</p>
            <p className="text-3xl font-bold text-slate-900">{asambleas.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Finalizadas</p>
            <p className="text-3xl font-bold text-green-600">
              {asambleas.filter(a => a.estado === 'finalizada').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Activas</p>
            <p className="text-3xl font-bold text-blue-600">
              {asambleas.filter(a => a.estado === 'activa').length}
            </p>
          </div>
        </div>

        {/* Lista de Asambleas */}
        {asambleas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No hay asambleas registradas
            </h3>
            <p className="text-slate-600">
              Este conjunto aún no ha creado ninguna asamblea
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {asambleas.map((asamblea) => (
              <div
                key={asamblea.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 capitalize">
                        Asamblea {asamblea.tipo}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${asamblea.estado === 'activa' ? 'bg-green-100 text-green-800' :
                        asamblea.estado === 'finalizada' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {asamblea.estado.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">
                      {format(new Date(asamblea.fechaHora), "d 'de' MMMM 'de' yyyy 'a las' h:mm a", { locale: es })}
                    </p>

                    <div className="flex gap-6 text-sm text-slate-600">
                      <div>
                        <span className="text-slate-500">Votantes:</span>{' '}
                        <span className="font-medium">{asamblea._count.votantes}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Proposiciones:</span>{' '}
                        <span className="font-medium">{asamblea._count.proposiciones}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Quórum:</span>{' '}
                        <span className={`font-medium ${asamblea.quorumInicial >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {asamblea.quorumInicial.toFixed(1)}%
                        </span>
                      </div>
                      {asamblea.quorumFinal !== null && (
                        <div>
                          <span className="text-slate-500">Quórum Final:</span>{' '}
                          <span className={`font-medium ${asamblea.quorumFinal >= 50 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                            {asamblea.quorumFinal.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {asamblea.estado === 'finalizada' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => descargarPDF(asamblea.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Ver PDF
                      </Button>
                      {/*Btn enviar email, pediente solamente comprar y configurar dominio*/}
                      <Button
                        onClick={() => abrirModalEmail(asamblea.id)}
                        size="sm"
                        variant="outline"
                        disabled={enviandoEmail === asamblea.id}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Email
                      </Button>
                    </div>
                  )}

                  {asamblea.estado !== 'finalizada' && (
                    <Button
                      onClick={() => router.push(`/admin/asambleas/${asamblea.id}`)}
                      size="sm"
                      variant="outline"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Email */}
      {mostrarModalEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Enviar Reporte por Email</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email de destino
              </label>
              <Input
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                placeholder="admin@conjunto.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                El reporte se enviará como archivo adjunto
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setMostrarModalEmail(false)
                  setEmailDestino('')
                }}
                variant="outline"
                className="flex-1"
                disabled={enviandoEmail !== null}
              >
                Cancelar
              </Button>
              <Button
                onClick={enviarEmail}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                disabled={!emailDestino || enviandoEmail !== null}
              >
                {enviandoEmail ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {Dialog}
    </SuperAdminLayout>
  )
}