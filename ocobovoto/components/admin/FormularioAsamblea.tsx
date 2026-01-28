'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Save } from 'lucide-react'

interface FormularioAsambleaProps {
  conjuntoId: string
  onCreada?: (asambleaId: string) => void
}

export function FormularioAsamblea({ conjuntoId, onCreada }: FormularioAsambleaProps) {
  const [tipo, setTipo] = useState<'ordinaria' | 'extraordinaria'>('ordinaria')
  const [fechaHora, setFechaHora] = useState('')
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'hibrida'>('presencial')
  const [quorumRequerido, setQuorumRequerido] = useState('50')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const response = await fetch('/api/asambleas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjuntoId,
          tipo,
          fechaHora,
          modalidad,
          quorumRequerido: parseFloat(quorumRequerido),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Asamblea creada exitosamente')
        onCreada?.(data.data.id)
        // Reset form
        setFechaHora('')
        setQuorumRequerido('50')
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <h2 className="text-xl font-semibold">Nueva Asamblea</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="ordinaria">Ordinaria</option>
            <option value="extraordinaria">Extraordinaria</option>
          </select>
        </div>

        {/* Modalidad */}
        <div>
          <label className="block text-sm font-medium mb-2">Modalidad</label>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value as any)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="hibrida">Híbrida</option>
          </select>
        </div>

        {/* Fecha y Hora */}
        <div>
          <label className="block text-sm font-medium mb-2">Fecha y Hora</label>
          <Input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            required
          />
        </div>

        {/* Quórum Requerido */}
        <div>
          <label className="block text-sm font-medium mb-2">Quórum Requerido (%)</label>
          <Input
            type="number"
            value={quorumRequerido}
            onChange={(e) => setQuorumRequerido(e.target.value)}
            min="1"
            max="100"
            step="0.01"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={guardando} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {guardando ? 'Guardando...' : 'Crear Asamblea'}
      </Button>
    </form>
  )
}