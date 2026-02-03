'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash, Save } from 'lucide-react'
import { Toast } from '../ui/toast'

interface FormularioProposicionProps {
  asambleaId: string
  onResultado?: (result: {
    success: boolean
    message: string
  }) => void
}

export function FormularioProposicion({ asambleaId, onResultado }: FormularioProposicionProps) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoPregunta, setTipoPregunta] = useState<'binaria' | 'multiple'>('binaria')
  const [tipoMayoria, setTipoMayoria] = useState<'simple' | 'calificada'>('simple')
  const [porcentaje, setPorcentaje] = useState('50')
  const [opciones, setOpciones] = useState([
    { texto: 'Sí', codigo: 'SI' },
    { texto: 'No', codigo: 'NO' },
    { texto: 'Blanco', codigo: 'BLANCO' },
  ])
  const [guardando, setGuardando] = useState(false)

  const agregarOpcion = () => {
    setOpciones([...opciones, { texto: '', codigo: `OPCION_${opciones.length + 1}` }])
  }

  const eliminarOpcion = (index: number) => {
    setOpciones(opciones.filter((_, i) => i !== index))
  }

  const editarOpcion = (index: number, campo: 'texto' | 'codigo', valor: string) => {
    const nuevas = [...opciones]
    nuevas[index][campo] = valor
    setOpciones(nuevas)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const response = await fetch('/api/proposiciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId,
          titulo,
          descripcion,
          tipoPregunta,
          tipoMayoria,
          porcentajeRequerido: parseFloat(porcentaje),
          opciones,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTitulo('')
        setDescripcion('')
        onResultado?.({
          success: true,
          message: 'La pregunta fue creada correctamente y ya está disponible para votación.'
        })
      } else {
        onResultado?.({
          success: false,
          message: data.error || 'Error al crear la proposición'
        })
      }
    } catch (error) {
      onResultado?.({
        success: false,
        message: 'Error de conexión con el servidor'
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <h3 className="text-lg font-semibold">Nueva Pregunta</h3>

      <div>
        <label className="block text-sm font-medium mb-2">Título</label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="¿Aprobar pintura de fachada?"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 min-h-20"
          placeholder="Detalle de la pregunta..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Pregunta</label>
          <select
            value={tipoPregunta}
            onChange={(e) => {
              setTipoPregunta(e.target.value as any)
              if (e.target.value === 'binaria') {
                setOpciones([
                  { texto: 'Sí', codigo: 'SI' },
                  { texto: 'No', codigo: 'NO' },
                  { texto: 'Blanco', codigo: 'BLANCO' },
                ])
              } else {
                setOpciones([
                  { texto: 'Opción A', codigo: 'OPCION_A' },
                  { texto: 'Opción B', codigo: 'OPCION_B' },
                ])
              }
            }}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="binaria">Sí / No / Blanco</option>
            <option value="multiple">Opciones Personalizadas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Mayoría</label>
          <select
            value={tipoMayoria}
            onChange={(e) => {
              setTipoMayoria(e.target.value as any)
              setPorcentaje(e.target.value === 'simple' ? '50' : '70')
            }}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="simple">Mayoría Simple (50%)</option>
            <option value="calificada">Mayoría Calificada</option>
          </select>
        </div>
      </div>

      {tipoMayoria === 'calificada' && (
        <div>
          <label className="block text-sm font-medium mb-2">Porcentaje Requerido (%)</label>
          <Input
            type="number"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            min="50"
            max="100"
            step="0.01"
          />
        </div>
      )}

      {/* Opciones */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium">Opciones de Respuesta</label>
          {tipoPregunta === 'multiple' && (
            <Button type="button" onClick={agregarOpcion} size="sm" variant="outline">
              <Plus className="mr-1 h-3 w-3" />
              Agregar
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {opciones.map((opcion, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opcion.texto}
                onChange={(e) => editarOpcion(i, 'texto', e.target.value)}
                placeholder="Texto de la opción"
                disabled={tipoPregunta === 'binaria'}
              />
              {tipoPregunta === 'multiple' && opciones.length > 2 && (
                <Button
                  type="button"
                  onClick={() => eliminarOpcion(i)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={guardando} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {guardando ? 'Guardando...' : 'Crear Pregunta'}
      </Button>
    </form>
  )
}