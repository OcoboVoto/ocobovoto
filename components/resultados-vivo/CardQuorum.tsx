//app/components/resultados-vivo/cardQuorum.tsx
'use client'

import { Users, CheckCircle, Lock } from 'lucide-react'
import { GraficoTorta } from './GraficoTorta'
import { AnimatedNumber } from './AnimatedNumber'

interface QuorumData {
  inicial: {
    porcentaje: number
    coeficiente: number
    votantes: number
  },
  cierre: {
    porcentaje: number
    coeficiente: number
    votantes: number
  } | null,
  final: {
    porcentaje: number
    coeficiente: number
    votantes: number
  } | null
  confirmacionActivada: boolean
  registrosCerrados: boolean
  quorumAlCierreRegistros: number | null
  fechaCierreRegistros: string | null
}

interface CardQuorumProps {
  quorum: QuorumData
}

function colorPorcentaje(p: number) {
  if (p >= 50) return { valor: '#10b981', texto: 'text-green-600' }
  if (p >= 30) return { valor: '#f59e0b', texto: 'text-yellow-500' }
  return { valor: '#ef4444', texto: 'text-red-500' }
}

function buildDatos(porcentaje: number) {
  const color = colorPorcentaje(porcentaje)
  return [
    { nombre: 'Presente', valor: porcentaje, porcentaje, color: color.valor },
    { nombre: 'Ausente', valor: 100 - porcentaje, porcentaje: 100 - porcentaje, color: '#e5e7eb' },
  ]
}

interface PanelQuorumProps {
  titulo: string
  subtitulo: string
  icono: React.ReactNode
  badge?: React.ReactNode
  porcentaje: number
  coeficiente: number
  votantes: number
  labelVotantes: string
}

function PanelQuorum({
  titulo, subtitulo, icono, badge,
  porcentaje, coeficiente, votantes, labelVotantes,
}: PanelQuorumProps) {
  const color = colorPorcentaje(porcentaje)

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado del panel */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
            {icono}
            {titulo}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 ml-6">{subtitulo}</p>
        </div>
        {badge}
      </div>

      {/* Gráfica de torta con porcentaje centrado */}
      <div className="relative">
        <GraficoTorta datos={buildDatos(porcentaje)} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`text-4xl font-extrabold ${color.texto}`}>
            <AnimatedNumber value={Number(porcentaje.toFixed(2))} />%
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{votantes}</div>
          <div className="text-xs text-gray-500 mt-0.5">{labelVotantes}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${color.texto}`}>
            <AnimatedNumber value={coeficiente} />%
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Coeficiente</div>
        </div>
      </div>
    </div>
  )
}

export function CardQuorum({ quorum }: CardQuorumProps) {
  const { inicial, final, confirmacionActivada, registrosCerrados, quorumAlCierreRegistros, fechaCierreRegistros } = quorum
  const hayFinal = final !== null

  const mostrarQ1 = registrosCerrados && quorumAlCierreRegistros !== null

  const mostrarSegundaGrafica = confirmacionActivada || hayFinal
  // En curso = confirmación activa pero aún no hay datos finales cerrados
  const estaEnCurso = confirmacionActivada

  // Definitivo = hay datos finales Y la confirmación ya NO está activa (fue cerrada)  
  const esDefinitivo = hayFinal && !confirmacionActivada

  // Datos para la gráfica derecha: si hay final usa final, si no usa inicial (en espera)
  const datosActual = final ?? inicial


  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
          <Users className="h-7 w-7 text-blue-600" />
          Quórum Actual
        </h2>
        {mostrarSegundaGrafica && (
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border ${esDefinitivo
            ? 'text-blue-600 bg-blue-50 border-blue-200'
            : 'text-green-600 bg-green-50 border-green-200'
            }`}>
            <CheckCircle className="h-4 w-4" />
            {esDefinitivo ? 'Confirmación Completada' : 'Confirmación Activada'}
          </div>
        )}
      </div>

      <div className={mostrarQ1 && mostrarSegundaGrafica ? 'grid md:grid-cols-3 gap-10 items-start' :
        mostrarQ1 || mostrarSegundaGrafica ? 'grid md:grid-cols-2 gap-10 items-start' : 'max-w-sm mx-auto'}
      >
        {/* Q1 — Cierre de Registros */}
        {mostrarQ1 && (
          <PanelQuorum
            titulo="Cierre de Registros"
            subtitulo={
              fechaCierreRegistros ? `Capturado ${new Date(fechaCierreRegistros).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}` : 'Registro cerrado'
            }
            icono={<Lock className="h-4 w-4 text-amber-600" />}
            badge={
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                Formal
              </span>
            }
            porcentaje={quorum.cierre?.porcentaje ?? 0}
            coeficiente={quorum.cierre?.coeficiente ?? 0}
            votantes={quorum.cierre?.votantes ?? 0}
            labelVotantes="Propietarios al cierre"
          />
        )}

        {/* Quórum Inicial */}
        <PanelQuorum
          titulo="Quórum Inicial"
          subtitulo="Todos los votantes registrados"
          icono={<Users className="h-4 w-4 text-blue-500" />}
          porcentaje={inicial.porcentaje}
          coeficiente={inicial.coeficiente}
          votantes={inicial.votantes}
          labelVotantes="Registrados"
        />

        {/* DERECHA — Quórum de confirmación */}
        {mostrarSegundaGrafica && (
          <PanelQuorum
            titulo={esDefinitivo ? 'Quórum Confirmado' : 'Quórum en Curso'}
            subtitulo={
              esDefinitivo
                ? 'Solo quienes confirmaron asistencia'
                : 'Esperando confirmaciones...'
            }
            icono={
              esDefinitivo
                ? <CheckCircle className="h-4 w-4 text-green-500" />
                : <Lock className="h-4 w-4 text-gray-400" />
            }
            badge={
              estaEnCurso ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 flex-shrink-0">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                  Vivo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 flex-shrink-0">
                  <CheckCircle className="h-3 w-3" />
                  Definitivo
                </span>
              )
            }
            porcentaje={datosActual.porcentaje}
            coeficiente={datosActual.coeficiente}
            votantes={datosActual.votantes}
            labelVotantes={esDefinitivo ? 'Confirmados' : 'Registrados'}
          />
        )}
      </div>

      {!mostrarSegundaGrafica && (
        <p className="text-center text-sm text-gray-400 mt-8">
          El quórum confirmado aparecerá aquí cuando el administrador active la confirmación de asistencia
        </p>
      )}
    </div>
  )
}