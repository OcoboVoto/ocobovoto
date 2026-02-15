// components/registro/SelectorModalidadAsistencia.tsx
'use client'

import { Building, Monitor } from 'lucide-react'

interface SelectorModalidadAsistenciaProps {
  modalidadAsamblea: 'presencial' | 'virtual' | 'mixta'
  modalidadSeleccionada: 'presencial' | 'virtual'
  onChange: (modalidad: 'presencial' | 'virtual') => void
}

export function SelectorModalidadAsistencia({
  modalidadAsamblea,
  modalidadSeleccionada,
  onChange,
}: SelectorModalidadAsistenciaProps) {
  // En presencial pura: no mostrar selector, siempre presencial
  if (modalidadAsamblea === 'presencial') return null

  // En virtual pura: no mostrar selector, siempre virtual
  if (modalidadAsamblea === 'virtual') return null

  // Solo en MIXTA mostramos el selector
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        ¿Cómo estás participando en esta asamblea?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('presencial')}
          className={`p-4 rounded-lg border-2 transition-colors text-center ${
            modalidadSeleccionada === 'presencial'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Building
            className={`h-6 w-6 mx-auto mb-2 ${
              modalidadSeleccionada === 'presencial' ? 'text-indigo-600' : 'text-gray-400'
            }`}
          />
          <p
            className={`text-sm font-medium ${
              modalidadSeleccionada === 'presencial' ? 'text-indigo-900' : 'text-gray-700'
            }`}
          >
            Presencial
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange('virtual')}
          className={`p-4 rounded-lg border-2 transition-colors text-center ${
            modalidadSeleccionada === 'virtual'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Monitor
            className={`h-6 w-6 mx-auto mb-2 ${
              modalidadSeleccionada === 'virtual' ? 'text-indigo-600' : 'text-gray-400'
            }`}
          />
          <p
            className={`text-sm font-medium ${
              modalidadSeleccionada === 'virtual' ? 'text-indigo-900' : 'text-gray-700'
            }`}
          >
            Virtual
          </p>
        </button>
      </div>
    </div>
  )
}

// ─── Helper para obtener la modalidad automática ────────────────────────────
// Usar esta función en la página de registro para determinar qué modalidad
// enviar al API sin necesidad de que el usuario elija en presencial/virtual pura.
export function getModalidadAsistencia(
  modalidadAsamblea: string,
  seleccionUsuario: 'presencial' | 'virtual'
): 'presencial' | 'virtual' {
  if (modalidadAsamblea === 'presencial') return 'presencial'
  if (modalidadAsamblea === 'virtual') return 'virtual'
  // mixta: el usuario eligió
  return seleccionUsuario
}