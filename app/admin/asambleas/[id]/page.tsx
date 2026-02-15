//app/admin/asamblea/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { GeneradorQR } from '@/components/admin/GeneradorQR'
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { ArrowLeft, Monitor, Play, Plus, Square } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ListaVotantes } from '@/components/admin/ListaVotantes'
import { ControlVotacion } from '@/components/admin/ControlVotacion'
import { FormularioProposicion } from '@/components/admin/FormularioPregunta'
import { BotonConfirmarAsistencia } from '@/components/admin/BotonConfirmarAsistencia'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'
import { GestionPoderes } from '@/components/admin/GestionPoderes'
import { supabase } from '@/lib/supabase/createBrowserClient'
import { useRef } from 'react'

interface Votante {
  id: string
  cedula: string
  nombreCompleto: string
  coeficienteTotal: number
  propietariosRepresenta: number
  createdAt: string
}

interface Asamblea {
  id: string
  tipo: string
  fechaHora: string
  modalidad: string
  estado: string
  quorumRequerido: number
  quorumInicial: number
  quorumFinal: number
  qrCodeData: string
  conjuntoId: string
  conjunto: {
    id: string
    nombre: string
    coeficienteTotal: number
  },
  proposiciones: any[]
  votantes?: Votante[]
  confirmacionActivada: boolean
  confirmacionCerrada: boolean
  _count: {
    votantes: number
    registros: number
  }
}

interface ResultadoData {
  proposicion: {
    id: string
    titulo: string
    tipoMayoria: string
    porcentajeRequerido: number
  }
  resultados: any[]
  noVotaron: {
    coeficiente: number
    porcentaje: number
    personas: number
  }
  resumen: {
    totalVotantes: number
    totalVotos: number
    coeficienteTotalPresente: number
    aprobada: boolean
    opcionGanadora: string | null
  }
}

export default function DetalleAsambleaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [asamblea, setAsamblea] = useState<Asamblea | null>(null)
  const [loading, setLoading] = useState(true)
  const [mostrarFormProposicion, setMostrarFormProposicion] = useState(false)
  const { confirm, Dialog } = useConfirmDialog()
  const [resultadosMap, setResultadosMap] = useState<Record<string, ResultadoData>>({})

  const proposicionesRef = useRef<{ id: string; estado: string }[]>([])

  const [toastOpen, setToastOpen] = useState(false)
  const [toastConfig, setToastConfig] = useState({
    title: '',
    description: '',
    variant: 'success' as 'success' | 'error'
  })

  const fromSuper = searchParams.get('from') === 'super'
  const conjuntoId = searchParams.get('conjuntoId')


  const fetchResultadosProposicion = useCallback(async (proposicionId: string) => {
    try {
      const res = await fetch(`/api/proposiciones/${proposicionId}/resultados`)
      const data = await res.json()
      if (data.success) {
        setResultadosMap((prev) => ({
          ...prev,
          [proposicionId]: data.data,
        }))
      }
    } catch (e) {
      console.error('Error cargando resultados:', e)
    }
  }, []) // sin deps → referencia estable para toda la vida del componente

  const fetchAsamblea = useCallback(async () => {
    try {
      const response = await fetch(`/api/asambleas/${id}`)
      const data = await response.json()
      if (data.success) {
        const proposiciones: any[] = data.data.proposiciones
        proposiciones.sort((a: any, b: any) => b.numeroOrden - a.numeroOrden)

        setAsamblea({ ...data.data, proposiciones })  
        proposicionesRef.current = proposiciones.map(  
          (p: any) => ({ id: p.id, estado: p.estado })  
        )

        proposiciones
          .filter((p) => p.estado === 'activa' || p.estado === 'cerrada')
          .forEach((p) => fetchResultadosProposicion(p.id))
      }
    } catch (error) {
      console.error('Error al cargar asamblea:', error)
    } finally {
      setLoading(false)
    }
  }, [id, fetchResultadosProposicion])

  //Carga inicial
  useEffect(() => {
    fetchAsamblea()
  }, [id])


  //RealTime 
  useEffect(() => {
    if (!id) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const timeoutId = setTimeout(() => {
      channel = supabase
        .channel(`detalle-asamblea-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'votos',
          },
          (payload) => {
            console.log('Realtime payload:', payload)

            const proposicionId =
              payload.new.proposicionId || payload.new.proposicion_id

            if (proposicionId) {
              fetchResultadosProposicion(proposicionId)
            } else {
              console.warn(
                '[Realtime] payload.new vacío. Aplica fix_rls_votos.sql en Supabase.'
              )
              proposicionesRef.current
                .filter((p) => p.estado === 'activa' || p.estado === 'cerrada')
                .forEach((p) => fetchResultadosProposicion(p.id))
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'votantes',
          },
          (payload) => {
            console.log('[Realtime] Nuevo votante:', payload)

            // Filtrar manualmente por asamblea_id  
            const asambleaIdPayload =
              payload.new.asambleaId || payload.new.asamblea_id

            if (!asambleaIdPayload || asambleaIdPayload === id) {
              console.log('[Realtime] Recargando votantes...')
              fetchAsamblea()
            } else {
              console.log('[Realtime] Votante de otra asamblea, ignorando.', {
                esperado: id,
                recibido: asambleaIdPayload,
              })
            }
          }
        )
        // Listener para proposiciones (cambios de estado)  
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'proposiciones',
          },
          (payload) => {
            console.log('[Realtime] Cambio en proposiciones:', payload)
            fetchAsamblea()
          }
        )
        // Listener para confirmaciones de asistencia  
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'confirmaciones_asistencia',
          },
          (payload) => {
            console.log('[Realtime] Cambio en confirmaciones:', payload)
            fetchAsamblea()
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime detalle-asamblea-all-${id}] status:`, status)
        })
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [id, fetchResultadosProposicion, fetchAsamblea])


  const handleVolver = () => {
    if (fromSuper && conjuntoId) {
      // Si viene del super-admin, volver a la lista de asambleas del conjunto
      router.push(`/super-admin/conjuntos/${conjuntoId}/asambleas`)
    } else {
      // Si viene del admin normal, volver a /admin/asambleas
      router.push('/admin/asambleas')
    }
  }

  const mostrarConfirmacion = (nuevoEstado: string) => {
    if (nuevoEstado === 'activa') {
      confirm({
        title: 'Iniciar Asamblea',
        description: '¿Estás seguro de iniciar la asamblea? Los propietarios podrán comenzar a registrarse con el código QR.',
        confirmText: 'Iniciar Asamblea',
        cancelText: 'Cancelar',
        variant: 'success',
        hideCancel: false,
        onConfirm: () => { cambiarEstado('activa') }
      })

    } else if (nuevoEstado === 'finalizada') {


      confirm({
        title: 'Finalizar Asamblea',
        description: 'Al finalizar la asamblea ya no se podrán registrar más votantes ni realizar votaciones. Esta acción no se puede deshacer.',
        confirmText: 'Finalizar',
        cancelText: 'Cancelar',
        variant: 'destructive',
        hideCancel: false,
        onConfirm: () => { cambiarEstado('finalizada') }
      })
    }
  }

  const cambiarEstado = async (nuevoEstado: string) => {
    try {
      const response = await fetch(`/api/asambleas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      const data = await response.json()

      if (data.success) {
        // Mostrar toast de éxito
        setToastConfig({
          title: nuevoEstado === 'activa' ? 'Asamblea Iniciada' : 'Asamblea Finalizada',
          description: nuevoEstado === 'activa'
            ? 'Los propietarios ya pueden registrarse'
            : 'La asamblea ha sido finalizada exitosamente',
          variant: 'success'
        })
        setToastOpen(true)

        // Recargar datos
        fetchAsamblea()
      }
    } catch (error) {
      // Mostrar toast de error
      setToastConfig({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la asamblea',
        variant: 'error'
      })
      setToastOpen(true)
    }
  }

  const abrirEnNuevaVentana = () => {
    if (typeof window === 'undefined') return

    const url = `${window.location.origin}/resultados-vivo/${asamblea?.id}`
    window.open(url, '_blank', 'noopener,noreferrer')
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

  if (!asamblea) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <p className="text-red-600">Asamblea no encontrada</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleVolver}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {fromSuper ? 'Volver a Asambleas del Conjunto' : 'Volver a Asambleas'}
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Asamblea {asamblea.tipo}
              </h1>
              <p className="text-gray-600">
                {format(new Date(asamblea.fechaHora), "d 'de' MMMM yyyy 'a las' h:mm a", { locale: es })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={abrirEnNuevaVentana}
                variant="outline"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-2"
              >
                <Monitor className="h-4 w-4" />
                Modo Presentación
              </Button>
              {asamblea.estado === 'borrador' && (
                <Button onClick={() => mostrarConfirmacion('activa')}>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Asamblea
                </Button>
              )}
              {asamblea.estado === 'activa' && (
                <Button onClick={() => mostrarConfirmacion('finalizada')}
                  className="bg-gray-900 hover:bg-black text-white">
                  <Square className="mr-2 h-4 w-4 fill-white" />
                  Finalizar Asamblea
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda: QR */}
          <div className="lg:col-span-1">
            <GeneradorQR
              asambleaId={asamblea.id}
              qrCodeData={asamblea.qrCodeData}
              url={`${window.location.origin}/registro/${asamblea.id}`}
            />
          </div>

          {/* QR de Votación */}
          <div className="lg:col-span-1">
            <GeneradorQR
              asambleaId={asamblea.id}
              qrCodeData={asamblea.qrCodeData}
              url={`${window.location.origin}/votar/${id}`}
            />
          </div>

          {/* Columna Derecha: Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Estadísticas */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Total Registros</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {asamblea._count.registros}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Votantes Únicos</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {asamblea._count.votantes}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quórum Requerido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {asamblea.quorumRequerido}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quórum Incial</p>
                  <p className={`text-2xl font-bold ${asamblea.quorumInicial >= asamblea.quorumRequerido
                    ? 'text-green-600'
                    : 'text-orange-600'
                    }`}>
                    {asamblea.quorumInicial.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Mostrar Quórum Final si hay confirmación */}
              {asamblea.confirmacionActivada && asamblea.quorumFinal !== null && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-blue-700 mb-1">Quórum Final (Después de Confirmación)</p>
                        <p className={`text-3xl font-bold ${asamblea.quorumFinal >= asamblea.quorumRequerido
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`}>
                          {asamblea.quorumFinal.toFixed(1)}%
                        </p>
                      </div>
                      {asamblea.quorumFinal < asamblea.quorumRequerido && (
                        <div className="text-right">
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            ⚠️ Quórum Perdido
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info General */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Información General</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Estado:</dt>
                  <dd className="font-medium capitalize">{asamblea.estado}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Modalidad:</dt>
                  <dd className="font-medium capitalize">{asamblea.modalidad}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Conjunto:</dt>
                  <dd className="font-medium">{asamblea.conjunto.nombre}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Tipo:</dt>
                  <dd className="font-medium">{asamblea.tipo}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Confirmación de Asistencia */}
        <div className="mt-12">
          {asamblea.estado === 'activa' && (
            <div className="mb-6">
              <BotonConfirmarAsistencia
                asambleaId={id}
                onActualizar={fetchAsamblea}
              />
            </div>
          )}
        </div>

        {/* Lista de Votantes */}
        <div className="mt-10">
          <ListaVotantes asambleaId={id}
            votantes={asamblea.votantes || []} />
        </div>

        {/* Gestión de Poderes */}
        {(asamblea.estado === 'activa' || asamblea.estado === 'borrador') && (
          <div className="mt-10">
            <GestionPoderes asambleaId={id} />
          </div>
        )}

        {/* SECCIÓN DE PROPOSICIONES */}
        <div className="mt-10">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Votaciones</h2>
              {asamblea.estado !== 'finalizada' && (
                <Button onClick={() => setMostrarFormProposicion(!mostrarFormProposicion)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {mostrarFormProposicion ? 'Cancelar' : 'Nueva votación'}
                </Button>
              )}
            </div>

            {/* Formulario (condicional) */}
            {mostrarFormProposicion && (
              <FormularioProposicion
                asambleaId={id}
                onResultado={({ success, message }) => {
                  confirm({
                    title: success ? 'Proposición creada' : 'Error',
                    description: message,
                    confirmText: 'Aceptar',
                    cancelText: 'Cancelar',
                    variant: success ? 'success' : 'destructive',
                    hideCancel: true,
                    onConfirm: () => {
                      if (success) {
                        setMostrarFormProposicion(false)
                        fetchAsamblea()
                      }
                    }
                  })
                }}
              />
            )}

            {/* Lista de Proposiciones */}
            {asamblea.proposiciones.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <p className="text-gray-600 mb-4">
                  No hay votaciones creadas aún
                </p>
                <Button onClick={() => setMostrarFormProposicion(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera votación
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {asamblea.proposiciones.map((proposicion) => (
                  <ControlVotacion
                    key={proposicion.id}
                    resultados={resultadosMap[proposicion.id] ?? null}
                    proposicion={proposicion}
                    asambleaFinalizada={asamblea.estado === 'finalizada'}
                    onActualizar={fetchAsamblea}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmación */}
      {Dialog}

      {/* Toast de Notificación */}
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        title={toastConfig.title}
        description={toastConfig.description}
        variant={toastConfig.variant}
      />
    </AdminLayout>
  )
}
