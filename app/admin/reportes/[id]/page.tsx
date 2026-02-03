'use client'

import { use, useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Reporte {
  asamblea: any
  conjunto: any
  asistentes: any[]
  noAsistentes: any[]
  proposiciones: any[]
  resumen: any
}

export default function ReportePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReporte()
  }, [id])

  const fetchReporte = async () => {
    try {
      const response = await fetch(`/api/asambleas/${id}/reporte`)
      const data = await response.json()

      if (data.success) {
        setReporte(data.data)
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setLoading(false)
    }
  }

  const imprimir = () => {
    window.print()
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

  if (!reporte) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <p className="text-red-600">Reporte no encontrado</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header - No imprimir */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/asambleas/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>

          <div className="flex gap-2">
            <Button onClick={imprimir} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={imprimir}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>

        {/* Contenido del Reporte */}
        <div className="bg-white rounded-lg shadow-sm border p-8 print:shadow-none print:border-0">
          {/* Header del Reporte */}
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ACTA DE ASAMBLEA
            </h1>
            <h2 className="text-xl text-gray-700 mb-4">
              {reporte.conjunto.nombre}
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>NIT: {reporte.conjunto.nit}</p>
              <p className="capitalize">
                Asamblea {reporte.asamblea.tipo} - {reporte.asamblea.modalidad}
              </p>
              <p>
                {format(new Date(reporte.asamblea.fechaHora), "d 'de' MMMM 'de' yyyy 'a las' h:mm a", { locale: es })}
              </p>
            </div>
          </div>

          {/* 1. Información General */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              1. INFORMACIÓN GENERAL
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estado:</span>
                <span className="ml-2 font-medium capitalize">{reporte.asamblea.estado}</span>
              </div>
              <div>
                <span className="text-gray-600">Modalidad:</span>
                <span className="ml-2 font-medium capitalize">{reporte.asamblea.modalidad}</span>
              </div>
              <div>
                <span className="text-gray-600">Quórum Requerido:</span>
                <span className="ml-2 font-medium">{reporte.asamblea.quorumRequerido}%</span>
              </div>
              <div>
                <span className="text-gray-600">Quórum Inicial:</span>
                <span className={`ml-2 font-medium ${reporte.asamblea.quorumInicial >= reporte.asamblea.quorumRequerido
                    ? 'text-green-600'
                    : 'text-red-600'
                  }`}>
                  {reporte.asamblea.quorumInicial.toFixed(2)}%
                </span>
              </div>
              {reporte.asamblea.quorumFinal !== null && (
                <>
                  <div className="col-span-2 border-t pt-3 mt-2">
                    <p className="text-xs text-gray-500 mb-2">Después de confirmación de asistencia:</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quórum Final:</span>
                    <span className={`ml-2 font-medium ${reporte.asamblea.quorumFinal >= reporte.asamblea.quorumRequerido
                        ? 'text-green-600'
                        : 'text-red-600'
                      }`}>
                      {reporte.asamblea.quorumFinal.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Variación:</span>
                    <span className={`ml-2 font-medium ${reporte.asamblea.quorumFinal < reporte.asamblea.quorumInicial
                        ? 'text-red-600'
                        : 'text-green-600'
                      }`}>
                      {(reporte.asamblea.quorumFinal - reporte.asamblea.quorumInicial).toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 2. Asistencia */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              2. ASISTENCIA
            </h3>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-medium text-green-700 mb-3">
                  Asistentes ({reporte.asistentes.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto text-sm">
                  {reporte.asistentes.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{a.nombreCompleto}</span>
                      <span className="text-gray-600">
                        {a.torreManzana} {a.aptoCasa} ({a.coeficiente}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-700 mb-3">
                  No Asistentes ({reporte.noAsistentes.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto text-sm">
                  {reporte.noAsistentes.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{a.nombreCompleto}</span>
                      <span className="text-gray-600">
                        {a.torreManzana} {a.aptoCasa}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Resultados de Votaciones */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              3. RESULTADOS DE VOTACIONES
            </h3>

            <div className="space-y-6">
              {reporte.proposiciones.map((prop: any) => (
                <div key={prop.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {prop.numeroOrden}. {prop.titulo}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{prop.descripcion}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Mayoría {prop.tipoMayoria} - {prop.porcentajeRequerido}% requerido
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${prop.aprobada
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {prop.aprobada ? 'APROBADA' : 'RECHAZADA'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {prop.opciones.map((opc: any, i: number) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{opc.texto}</span>
                            <span className="text-gray-600">
                              {opc.porcentaje.toFixed(1)}% • {opc.personas} votos
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${opc.porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-4 pt-2 border-t">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-600">No votaron</span>
                          <span className="text-gray-600">
                            {prop.noVotaron.porcentaje.toFixed(1)}% • {prop.noVotaron.personas} personas
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-400 h-2 rounded-full"
                            style={{ width: `${prop.noVotaron.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mt-3">
                    <strong>Resultado:</strong> {prop.opcionGanadora}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Resumen */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              4. RESUMEN
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Propietarios</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reporte.resumen.totalPropietarios}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Asistentes</p>
                <p className="text-2xl font-bold text-green-700">
                  {reporte.resumen.totalAsistentes}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">No Asistentes</p>
                <p className="text-2xl font-bold text-red-700">
                  {reporte.resumen.totalNoAsistentes}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Proposiciones</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {reporte.resumen.totalProposiciones}
                </p>
              </div>
            </div>
          </section>

          {/* Firma */}
          <div className="mt-12 pt-8 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="text-sm font-medium">Presidente</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="text-sm font-medium">Secretario</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>Generado por OcoboVoto el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}