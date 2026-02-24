//components/admin/BotonCerrarRegistro.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LockKeyhole, LockKeyholeOpen, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BotonCerrarRegistrosProps {
  asambleaId: string
  registrosCerrados: boolean
  quorumAlCierre?: number | null
  fechaCierre?: string | null
  onCerrar?: (snapshot: { quorum: number; fecha: string }) => void
}

export function BotonCerrarRegistros({
  asambleaId,
  registrosCerrados,
  quorumAlCierre,
  fechaCierre,
  onCerrar,
}: BotonCerrarRegistrosProps) {
  const [cerrando, setCerrando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)


  //  Estado inicial: botón para iniciar el cierre 
  const cerrarRegistros = async () => {
    setCerrando(true)
    try {
      const response = await fetch(`/api/asambleas/${asambleaId}/cerrar-registros`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        toast.success(
          `Registro cerrado. Quórum capturado: ${data.data.quorumAlCierreRegistros.toFixed(2)}%`
        )
        setConfirmar(false)
        onCerrar?.({
          quorum: data.data.quorumAlCierreRegistros,
          fecha: data.data.fechaCierreRegistros,
        })
      } else {
        toast.error('Error: ' + (data.error || 'No se pudo cerrar el registro'))
        setConfirmar(false)
      }
    } catch {
      toast.error('Error de conexión al cerrar registro')
      setConfirmar(false)
    } finally {
      setCerrando(false)
    }
  }

  //  Si ya está cerrado, mostrar estado informativo 
  if (registrosCerrados && quorumAlCierre != null) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-amber-100 rounded-lg shrink-0">
            <LockKeyhole className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 mb-1">
              Registro de Propietarios Cerrado
            </h3>
            <p className="text-sm text-amber-800 mb-3">
              El quórum fue capturado al momento del cierre. Los propietarios que se
              registren a partir de ahora quedan marcados como{' '}
              <span className="font-semibold">llegada tarde</span> para auditoría.
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center bg-white rounded-lg px-4 py-2 border border-amber-200">
                <p className="text-xs text-amber-700 mb-0.5 uppercase tracking-wide">
                  Quórum al cierre
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  {quorumAlCierre != null ? Number(quorumAlCierre).toFixed(2) : '0.00'}%
                </p>
              </div>
              {fechaCierre && (
                <div className="text-center bg-white rounded-lg px-4 py-2 border border-amber-200">
                  <p className="text-xs text-amber-700 mb-0.5 uppercase tracking-wide">
                    Hora de cierre
                  </p>
                  <p className="text-sm font-semibold text-amber-900 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(fechaCierre), "HH:mm 'del' d MMM", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Panel de confirmación antes de cerrar 
  if (confirmar) {
    return (
      <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-orange-100 rounded-lg shrink-0">
            <LockKeyhole className="h-5 w-5 text-orange-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-900 mb-2">
              ¿Confirmar cierre de registro?
            </h3>
            <p className="text-sm text-orange-800 mb-4">
              Se guardará el <strong>quórum de apertura</strong> con los propietarios
              registrados hasta este momento. Los que lleguen después quedarán
              registrados normalmente pero marcados como <strong>llegada tarde</strong>.
              Esta acción <strong>no se puede deshacer</strong>.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={cerrarRegistros}
                disabled={cerrando}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                {cerrando ? 'Cerrando...' : 'Sí, cerrar registro'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmar(false)}
                disabled={cerrando}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-orange-100 rounded-lg shrink-0">
          <LockKeyholeOpen className="h-5 w-5 text-orange-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-orange-900 mb-1">
            Finalizar Registro de Propietarios
          </h3>
          <p className="text-sm text-orange-800 mb-4">
            Cierra el registro inicial y captura el{' '}
            <strong>quórum de apertura de asamblea</strong>. Los propietarios que
            lleguen tarde podrán seguir registrándose pero quedarán marcados para
            auditoría. Este valor quedará en el acta oficial.
          </p>
          <Button
            onClick={() => setConfirmar(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            Cerrar Registro y Capturar Quórum
          </Button>
        </div>
      </div>
    </div>
  )
}