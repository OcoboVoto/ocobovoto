//app/admin/reportes/[id]/page.tsx

'use client'

import { use, useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ReporteAsambleaData } from '@/lib/reportes/get-asamblea-reporte'

//  Paleta de colores 
const OPTION_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
]
const NO_VOTARON_COLOR = '#fb923c'  // naranja

//  Tooltip recharts 
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const e = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1">{e.name}</p>
        <p className="text-gray-700">
          {e.value.toFixed(2)}%
        </p>
        {e.payload.personas !== undefined && (
          <p className="text-gray-500 text-xs">{e.payload.personas} personas</p>
        )}
      </div>
    )
  }
  return null
}

//  SVG Pie estático (funciona en impresión) 
interface SvgSlice { name: string; value: number; color: string; personas?: number }

function SvgPieChart({ data, size = 180 }: { data: SvgSlice[]; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6

  const total = data.reduce((s, d) => s + d.value, 0)
  let angle = -Math.PI / 2

  const slices = data.map(d => {
    const start = angle
    const sweep = total > 0 ? (d.value / total) * 2 * Math.PI : 0
    angle += sweep
    const end = angle
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = sweep > Math.PI ? 1 : 0
    // Label position
    const mid = start + sweep / 2
    const lx = cx + r * 0.65 * Math.cos(mid)
    const ly = cy + r * 0.65 * Math.sin(mid)
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    return { ...d, path, lx, ly, sweep }
  })

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth={1.5} />
          {s.sweep > 0.15 && (
            <text
              x={s.lx.toFixed(2)}
              y={s.ly.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={11}
              fontWeight={700}
            >
              {s.value.toFixed(1)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

//  Leyenda para SVG 
function SvgLegend({ data }: { data: SvgSlice[] }) {
  return (
    <div className="space-y-1.5 text-xs">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
          <span className="text-gray-700">{d.name}</span>
          <span className="ml-auto font-semibold text-gray-900">{d.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

//  Gráfica de proposición (screen) 
function ProposicionScreenChart({ prop }: { prop: any }) {
  const data = [
    ...prop.opciones.map((opc: any, i: number) => ({
      name: opc.texto,
      value: parseFloat(opc.porcentaje.toFixed(2)),
      personas: opc.personas,
      color: OPTION_COLORS[i % OPTION_COLORS.length],
    })),
    {
      name: 'No votaron',
      value: parseFloat(prop.noVotaron.porcentaje.toFixed(2)),
      personas: prop.noVotaron.personas,
      color: NO_VOTARON_COLOR,
    },
  ]

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    if (value < 5) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {`${value.toFixed(1)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={95} dataKey="value" labelLine={false} label={renderLabel}>
          {data.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={v => <span className="text-xs text-gray-700">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

//  Gráfica de quórum (screen) 
function QuorumScreenChart({ pct, color, label }: { pct: number; color: string; label: string }) {
  const data = [
    { name: label, value: parseFloat(pct.toFixed(2)), color },
    { name: 'Faltante', value: parseFloat((100 - pct).toFixed(2)), color: '#e5e7eb' },
  ]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" startAngle={90} endAngle={-270} labelLine={false}>
          {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill="#111827" fontSize={18} fontWeight={700}>{pct.toFixed(1)}%</text>
        </Pie>
        <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
      </PieChart>
    </ResponsiveContainer>
  )
}

//  Página principal 
export default function ReportePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  //const [reporte, setReporte] = useState<Reporte | null>(null)
  const [reporte, setReporte] = useState<ReporteAsambleaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReporte() }, [id])

  const fetchReporte = async () => {
    try {
      const res = await fetch(`/api/asambleas/${id}/reporte`)
      const data = await res.json()
      if (data.success) setReporte(data.data)
    } catch (e) {
      console.error('Error al cargar reporte:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    </AdminLayout>
  )

  if (!reporte) return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-red-600">Reporte no encontrado</p>
      </div>
    </AdminLayout>
  )

  const { asamblea, conjunto, asistentes, noAsistentes, proposiciones, poderes, resumen } = reporte

  //  Datos para las gráficas de quórum 
  // Q1: quórum al cierre de registro
  const quorumCierreData: SvgSlice[] | null = asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null ? [
    { name: 'Al cierre', value: Number(asamblea.quorumAlCierreRegistros), color: '#f59e0b' },
    { name: 'Faltante', value: Math.max(0, 100 - Number(asamblea.quorumAlCierreRegistros)), color: '#e5e7eb' },
  ] : null

  // Q2: quórum total acumulado (live / final)
  const quorumInicialData: SvgSlice[] = [
    { name: 'Quórum total', value: asamblea.quorumInicial, color: '#6366f1' },
    { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumInicial), color: '#e5e7eb' },
  ]

  // Q3: quórum post-confirmación
  const quorumFinalData: SvgSlice[] | null = asamblea.quorumFinal !== null ? [
    { name: 'Confirmados', value: asamblea.quorumFinal, color: '#22c55e' },
    { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumFinal), color: '#e5e7eb' },
  ] : null

  // Cuántas columnas necesita la sección de quórum
  const numQuorums = [quorumCierreData, true /* siempre Q2 */, quorumFinalData].filter(Boolean).length

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">

        {/*  Acciones (no imprimir)  */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => router.push(`/admin/asambleas/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>

        {/* ════════════ DOCUMENTO ════════════ */}
        <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none print:p-0 print:rounded-none">

          {/*  Encabezado del acta  */}
          <div className="text-center mb-8 border-b pb-6">
            {/* Logo solo visible en impresión */}
            <div className="hidden print:flex print:justify-center print:mb-3">
              <Image src="/banner.png" alt="OcoVoto" width={160} height={40} className="h-10 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ACTA DE ASAMBLEA</h1>
            <h2 className="text-xl text-gray-700 mt-1 uppercase">{conjunto.nombre}</h2>
            <p className="text-sm text-gray-500 mt-1">NIT: {conjunto.nit}</p>
          </div>

          {/* ═══ 1. INFORMACIÓN GENERAL ═════════════════════════════════════ */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">1. INFORMACIÓN GENERAL</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Tipo:</span><span className="ml-2 font-medium capitalize">{asamblea.tipo}</span></div>
              <div>
                <span className="text-gray-600">Fecha:</span>
                <span className="ml-2 font-medium">{format(new Date(asamblea.fechaHora), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
              </div>
              <div><span className="text-gray-600">Modalidad:</span><span className="ml-2 font-medium capitalize">{asamblea.modalidad}</span></div>
              <div><span className="text-gray-600">Estado:</span><span className="ml-2 font-medium capitalize">{asamblea.estado}</span></div>
              <div><span className="text-gray-600">Quórum requerido:</span><span className="ml-2 font-medium">{asamblea.quorumRequerido}%</span></div>
              {/*  Q1: Al cierre de registros  */}
              {asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null && (
                <div>
                  <span className="text-gray-600">Quórum cierre de registro:</span>
                  <span className={`ml-2 font-medium ${Number(asamblea.quorumAlCierreRegistros) >= asamblea.quorumRequerido ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(asamblea.quorumAlCierreRegistros).toFixed(2)}%
                  </span>
                  {asamblea.fechaCierreRegistros && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({format(new Date(asamblea.fechaCierreRegistros), "HH:mm", { locale: es })})
                    </span>
                  )}
                </div>
              )}
              {/*  Q2: Quórum total acumulado  */}
              <div>
                <span className="text-gray-600">{asamblea.registrosCerrados ? 'Quórum total acumulado:' : 'Quórum inicial:'}</span>
                <span className={`ml-2 font-medium ${asamblea.quorumInicial >= asamblea.quorumRequerido ? 'text-green-600' : 'text-red-600'}`}>
                  {asamblea.quorumInicial.toFixed(2)}%
                </span>
              </div>
              {/*  Q3: Post-confirmación  */}
              {asamblea.quorumFinal !== null && (
                <>
                  <div>
                    <span className="text-gray-600">Quórum post-confirmación:</span>
                    <span className={`ml-2 font-medium ${asamblea.quorumFinal >= asamblea.quorumRequerido ? 'text-green-600' : 'text-red-600'}`}>
                      {asamblea.quorumFinal.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Variación (Q2→Q3):</span>
                    <span className={`ml-2 font-medium ${asamblea.quorumFinal < asamblea.quorumInicial ? 'text-red-600' : 'text-green-600'}`}>
                      {(asamblea.quorumFinal - asamblea.quorumInicial).toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/*  Gráficas de quórum (hasta 3 columnas)  */}
            <div className={`mt-6 grid gap-6 ${numQuorums === 3 ? 'grid-cols-3' : numQuorums === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>

              {/*  Q1: Cierre de registros  */}
              {quorumCierreData && (
                <>
                  <div className="print:hidden">
                    <p className="text-xs font-semibold text-center text-amber-600 mb-1 uppercase tracking-wide">📋 Quórum al Cierre</p>
                    <QuorumScreenChart pct={Number(asamblea.quorumAlCierreRegistros!)} color="#f59e0b" label="Al cierre de registro" />
                  </div>
                  <div className="hidden print:block text-center">
                    <p className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wide">Quórum al Cierre</p>
                    <div className="flex flex-col items-center gap-3">
                      <SvgPieChart data={quorumCierreData} size={130} />
                      <SvgLegend data={quorumCierreData} />
                    </div>
                  </div>
                </>
              )}

              {/*  Q2: Total acumulado (siempre presente)  */}
              <div className="print:hidden">
                <p className="text-xs font-semibold text-center text-indigo-600 mb-1 uppercase tracking-wide">
                  {asamblea.registrosCerrados ? 'Quórum Total' : 'Quórum Inicial'}
                </p>
                <QuorumScreenChart pct={asamblea.quorumInicial} color="#6366f1" label="Quórum total" />
              </div>
              <div className="hidden print:block text-center">
                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
                  {asamblea.registrosCerrados ? 'Quórum Total' : 'Quórum Inicial'}
                </p>
                <div className="flex flex-col items-center gap-3">
                  <SvgPieChart data={quorumInicialData} size={130} />
                  <SvgLegend data={quorumInicialData} />
                </div>
              </div>

              {/*  Q3: Post-confirmación  */}
              {asamblea.quorumFinal !== null && quorumFinalData && (
                <>
                  <div className="print:hidden">
                    <p className="text-xs font-semibold text-center text-green-600 mb-1 uppercase tracking-wide">✅ Post-Confirmación</p>
                    <QuorumScreenChart pct={asamblea.quorumFinal} color="#22c55e" label="Confirmados presentes" />
                  </div>
                  <div className="hidden print:block text-center">
                    <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Post-Confirmación</p>
                    <div className="flex flex-col items-center gap-3">
                      <SvgPieChart data={quorumFinalData} size={130} />
                      <SvgLegend data={quorumFinalData} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ═══ 2. ASISTENCIA ══════════════════════════════════════════════ */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">2. ASISTENCIA</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Asistentes */}
              <div>
                <h4 className="font-medium text-green-700 mb-3">Asistentes ({asistentes.length})</h4>

                {/* Vista web: scroll */}
                <div className="space-y-1 max-h-80 overflow-y-auto text-sm print:hidden">
                  {asistentes.map((a, i) => (
                    <div key={i} className="flex justify-between items-center px-2 py-1 rounded-md bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-green-900 font-medium truncate">{a.nombreCompleto}</span>
                      </div>
                      <span className="text-green-600 shrink-0 text-xs font-medium">{a.torreManzana} {a.aptoCasa}</span>
                    </div>
                  ))}
                </div>

                {/* Vista impresión: lista completa con tabla */}
                <table className="hidden print:table w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="text-left py-1 px-2 border border-green-300 text-green-800">Nombre</th>
                      <th className="text-left py-1 px-2 border border-green-300 text-green-800">Ubicación</th>
                      <th className="text-right py-1 px-2 border border-green-300 text-green-800">Coef.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistentes.map((a, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                        <td className="py-1 px-2 border border-green-100 text-green-900 font-medium">{a.nombreCompleto}</td>
                        <td className="py-1 px-2 border border-green-100 text-green-700">{a.torreManzana} {a.aptoCasa}</td>
                        <td className="py-1 px-2 border border-green-100 text-right text-green-700">{a.coeficiente.toFixed(4)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* No asistentes */}
              <div>
                <h4 className="font-medium text-red-700 mb-3">No Asistentes ({noAsistentes.length})</h4>

                {/* Vista web: scroll */}
                <div className="space-y-1 max-h-80 overflow-y-auto text-sm print:hidden">
                  {noAsistentes.map((a, i) => (
                    <div key={i} className="flex justify-between items-center px-2 py-1 rounded-md bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="text-red-900 font-medium truncate">{a.nombreCompleto}</span>
                      </div>
                      <span className="text-red-500 shrink-0 text-xs font-medium">{a.torreManzana} {a.aptoCasa}</span>
                    </div>
                  ))}
                </div>

                {/* Vista impresión: tabla completa */}
                <table className="hidden print:table w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-red-100">
                      <th className="text-left py-1 px-2 border border-red-300 text-red-800">Nombre</th>
                      <th className="text-left py-1 px-2 border border-red-300 text-red-800">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noAsistentes.map((a, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                        <td className="py-1 px-2 border border-red-100 text-red-900 font-medium">{a.nombreCompleto}</td>
                        <td className="py-1 px-2 border border-red-100 text-red-600">{a.torreManzana} {a.aptoCasa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ═══ 3. PODERES OTORGADOS ════════════════════════════════════════ */}
          {poderes && poderes.length > 0 && (
            <section className="mb-8 print:break-inside-avoid">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">3. PODERES OTORGADOS ({poderes.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-2 px-3 border border-gray-300">#</th>
                      <th className="text-left py-2 px-3 border border-gray-300">Otorgante</th>
                      <th className="text-left py-2 px-3 border border-gray-300">Ubicación</th>
                      <th className="text-right py-2 px-3 border border-gray-300">Coef.</th>
                      <th className="text-left py-2 px-3 border border-gray-300">Apoderado</th>
                      <th className="text-left py-2 px-3 border border-gray-300">CC Apoderado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poderes.map((p, i) => (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-3 border border-gray-200 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-3 border border-gray-200">
                          <div className="font-medium">{p.otorgante.nombreCompleto}</div>
                          <div className="text-xs text-gray-500">CC: {p.otorgante.cedula}</div>
                        </td>
                        <td className="py-2 px-3 border border-gray-200 text-gray-600 text-xs">
                          {p.otorgante.torreManzana} {p.otorgante.aptoCasa}
                        </td>
                        <td className="py-2 px-3 border border-gray-200 text-right font-medium text-indigo-700">
                          {p.otorgante.coeficiente.toFixed(4)}%
                        </td>
                        <td className="py-2 px-3 border border-gray-200 font-medium">{p.apoderado.nombreCompleto}</td>
                        <td className="py-2 px-3 border border-gray-200 text-gray-600">{p.apoderado.cedula}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══ 4. RESULTADOS DE VOTACIONES ════════════════════════════════ */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              {poderes && poderes.length > 0 ? '4' : '3'}. RESULTADOS DE VOTACIONES
            </h3>

            <div className="space-y-8">
              {proposiciones.map((prop: any) => {
                // Datos de la torta para esta proposición
                const pieData: SvgSlice[] = [
                  ...prop.opciones.map((opc: any, i: number) => ({
                    name: opc.texto,
                    value: parseFloat(opc.porcentaje.toFixed(2)),
                    personas: opc.personas,
                    color: OPTION_COLORS[i % OPTION_COLORS.length],
                  })),
                  {
                    name: 'No votaron',
                    value: parseFloat(prop.noVotaron.porcentaje.toFixed(2)),
                    personas: prop.noVotaron.personas,
                    color: NO_VOTARON_COLOR,
                  },
                ]

                return (
                  <div key={prop.id} className="border rounded-lg p-5 print:break-inside-avoid print:border-gray-300">

                    {/* Encabezado proposición */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <h4 className="font-semibold text-gray-900">{prop.numeroOrden}. {prop.titulo}</h4>
                        <p className="text-sm text-gray-600 mt-1">{prop.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Mayoría {prop.tipoMayoria} · {prop.porcentajeRequerido}% requerido
                        </p>
                      </div>
                      {/* Badge APROBADA/RECHAZADA comentado por solicitud del cliente */}
                      {/* <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${
                        prop.aprobada ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {prop.aprobada ? '✓ APROBADA' : '✗ RECHAZADA'}
                      </span> */}
                    </div>

                    {/* Gráfica screen (recharts) */}
                    <div className="print:hidden">
                      <ProposicionScreenChart prop={prop} />
                    </div>

                    {/* Gráfica print (SVG estático) + tabla de datos */}
                    <div className="hidden print:grid print:grid-cols-2 print:gap-6 print:items-start">
                      {/* Pie SVG */}
                      <div className="flex flex-col items-center gap-3">
                        <SvgPieChart data={pieData} size={160} />
                        <SvgLegend data={pieData} />
                      </div>

                      {/* Tabla numérica detallada */}
                      <table className="w-full text-xs border-collapse self-start">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left py-1.5 px-2 border border-gray-300">Opción</th>
                            <th className="text-right py-1.5 px-2 border border-gray-300">%</th>
                            <th className="text-right py-1.5 px-2 border border-gray-300">Votos</th>
                            <th className="text-right py-1.5 px-2 border border-gray-300">Coef.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prop.opciones.map((opc: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                              <td className="py-1.5 px-2 border border-gray-200">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length] }} />
                                  {opc.texto}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 border border-gray-200 text-right font-semibold">{opc.porcentaje.toFixed(2)}%</td>
                              <td className="py-1.5 px-2 border border-gray-200 text-right">{opc.personas}</td>
                              <td className="py-1.5 px-2 border border-gray-200 text-right">{opc.coeficiente.toFixed(4)}%</td>
                            </tr>
                          ))}
                          <tr className="bg-orange-50">
                            <td className="py-1.5 px-2 border border-gray-200">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NO_VOTARON_COLOR }} />
                                No votaron
                              </div>
                            </td>
                            <td className="py-1.5 px-2 border border-gray-200 text-right font-semibold">{prop.noVotaron.porcentaje.toFixed(2)}%</td>
                            <td className="py-1.5 px-2 border border-gray-200 text-right">{prop.noVotaron.personas}</td>
                            <td className="py-1.5 px-2 border border-gray-200 text-right">{prop.noVotaron.coeficiente.toFixed(4)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Tabla de detalle (solo web, debajo del gráfico screen) */}
                    <div className="mt-4 space-y-2 print:hidden">
                      {prop.opciones.map((opc: any, i: number) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length] }} />
                              <span className="font-medium">{opc.texto}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-gray-900">{opc.porcentaje.toFixed(1)}%</span>
                              <span className="text-gray-500 text-xs ml-2">({opc.personas} votos · coef. {opc.coeficiente.toFixed(4)}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${opc.porcentaje}%`, backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: NO_VOTARON_COLOR }} />
                            <span className="font-medium text-gray-600">No votaron</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">{prop.noVotaron.porcentaje.toFixed(1)}%</span>
                            <span className="text-gray-500 text-xs ml-2">({prop.noVotaron.personas} personas · coef. {prop.noVotaron.coeficiente.toFixed(4)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${prop.noVotaron.porcentaje}%`, backgroundColor: NO_VOTARON_COLOR }} />
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mt-4 pt-3 border-t">
                      <strong>Opción ganadora:</strong> {prop.opcionGanadora}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ═══ 5. RESUMEN ═════════════════════════════════════════════════ */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              {poderes && poderes.length > 0 ? '5' : '4'}. RESUMEN
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Propietarios</p>
                <p className="text-2xl font-bold text-gray-900">{resumen.totalPropietarios}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Asistentes</p>
                <p className="text-2xl font-bold text-green-700">{resumen.totalAsistentes}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">No Asistentes</p>
                <p className="text-2xl font-bold text-red-700">{resumen.totalNoAsistentes}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Proposiciones</p>
                <p className="text-2xl font-bold text-indigo-700">{resumen.totalProposiciones}</p>
              </div>
            </div>
            {resumen.totalPoderes > 0 && (
              <div className="mt-3 text-center">
                <div className="inline-block bg-purple-50 rounded-lg px-6 py-3">
                  <p className="text-sm text-gray-600 mb-1">Poderes registrados</p>
                  <p className="text-2xl font-bold text-purple-700">{resumen.totalPoderes}</p>
                </div>
              </div>
            )}
          </section>

          {/* ═══ FIRMAS ══════════════════════════════════════════════════════ */}
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
            <p>Generado por OcoVoto el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}