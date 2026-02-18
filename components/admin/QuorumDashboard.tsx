//components/admin/QuorumDashboard.tsx
'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LockKeyhole, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react'

interface QuorumDashboardProps {
  asamblea: {
    quorumRequerido: number
    quorumInicial: number
    // Q1
    registrosCerrados?: boolean
    quorumAlCierreRegistros?: number | null
    fechaCierreRegistros?: string | null
    // Q3
    confirmacionActivada?: boolean
    confirmacionCerrada?: boolean
    quorumFinal?: number | null
  }
  /** Clases adicionales para el contenedor */
  className?: string
}

function QuorumCard({ label, badge, value, requerido, sublabel, color, icon, }: {
  label: string
  badge?: string
  value: number
  requerido: number
  sublabel?: string
  color: 'amber' | 'indigo' | 'green'
  icon: React.ReactNode
}) {
  const cumple = value >= requerido

  const bg = {
    amber: 'bg-amber-50 border-amber-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    green: 'bg-green-50 border-green-200',
  }[color]

  const iconBg = {
    amber: 'bg-amber-100',
    indigo: 'bg-indigo-100',
    green: 'bg-green-100',
  }[color]

  const textColor = {
    amber: 'text-amber-700',
    indigo: 'text-indigo-700',
    green: 'text-green-700',
  }[color]

  return (
    <div className={`rounded-xl border p-5 ${bg} flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>{label}</p>
            {badge && (
              <p className="text-xs text-gray-500 mt-0.5">{badge}</p>
            )}
          </div>
        </div>
        {/* Estado */}
        {cumple ? (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
            ✓ Suficiente
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Insuficiente
          </span>
        )}
      </div>

      {/* Valor */}
      <div>
        <p className={`text-4xl font-extrabold ${cumple ? 'text-green-700' : 'text-red-600'}`}>
          {value.toFixed(2)}%
        </p>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${cumple ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Requerido: <span className="font-semibold">{requerido}%</span>
          {sublabel && <span className="ml-2 text-gray-400">· {sublabel}</span>}
        </p>
      </div>
    </div>
  )
}

export function QuorumDashboard({ asamblea, className = '' }: QuorumDashboardProps) {
  const {
    quorumRequerido,
    quorumInicial,
    registrosCerrados,
    quorumAlCierreRegistros,
    fechaCierreRegistros,
    confirmacionActivada,
    confirmacionCerrada,
    quorumFinal,
  } = asamblea

  const mostrarQ1 = registrosCerrados && quorumAlCierreRegistros !== undefined && quorumAlCierreRegistros !== null
  const mostrarQ3 = (confirmacionActivada || confirmacionCerrada) && quorumFinal !== undefined && quorumFinal !== null

  const cols = mostrarQ1 && mostrarQ3 ? 'grid-cols-3' : mostrarQ1 || mostrarQ3 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'

  return (
    <div className={`${className}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Trazabilidad de Quórum
      </p>
      <div className={`grid gap-4 ${cols}`}>
        {/*  Q1: Cierre de registros  */}
        {mostrarQ1 && (
          <QuorumCard
            label="Cierre de Registro"
            badge={fechaCierreRegistros
              ? `Capturado ${format(new Date(fechaCierreRegistros), "HH:mm 'del' d MMM", { locale: es })}`
              : 'Registro cerrado'}
            value={Number(quorumAlCierreRegistros)}
            requerido={quorumRequerido}
            sublabel="Propietarios al inicio formal"
            color="amber"
            icon={<LockKeyhole className="h-4 w-4 text-amber-700" />}
          />
        )}

        {/*  Q2: Quórum total / acumulado  */}
        <QuorumCard
          label={mostrarQ1 ? 'Total Acumulado' : 'Quórum Actual'}
          badge={mostrarQ1 ? 'Incluye llegadas tarde' : 'Todos los registrados'}
          value={quorumInicial}
          requerido={quorumRequerido}
          sublabel={mostrarQ1 ? 'Incluye tardíos' : undefined}
          color="indigo"
          icon={<TrendingUp className="h-4 w-4 text-indigo-700" />}
        />

        {/*  Q3: Post-confirmación  */}
        {mostrarQ3 && (
          <QuorumCard
            label="Post-Confirmación"
            badge={confirmacionCerrada ? 'Confirmación cerrada' : 'En curso'}
            value={Number(quorumFinal)}
            requerido={quorumRequerido}
            sublabel="Solo confirmados presentes"
            color="green"
            icon={<CheckCircle2 className="h-4 w-4 text-green-700" />}
          />
        )}
      </div>
    </div>
  )
}