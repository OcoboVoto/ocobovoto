'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, Save, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog'

interface PoderCSV {
  cedula_otorgante: string
  cedula_apoderado: string
  nombre_apoderado: string
}

interface EditorPoderesCSVProps {
  asambleaId: string
  onExito?: (count: number) => void
}

export function EditorPoderesCSV({
  asambleaId,
  onExito,
}: EditorPoderesCSVProps) {
  const [poderes, setPoderes] = useState<PoderCSV[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const { confirm, Dialog } = useConfirmDialog()

  /* ===============================
     CSV UPLOAD
  =============================== */
  const handleUploadCSV = (file: File) => {
    setErrores([])
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as PoderCSV[]

        const erroresLocal: string[] = []

        data.forEach((p, index) => {
          if (!p.cedula_otorgante || !p.cedula_apoderado || !p.nombre_apoderado) {
            erroresLocal.push(`Fila ${index + 2}: campos incompletos`)
          }
        })

        if (erroresLocal.length > 0) {
          setErrores(erroresLocal)
          return
        }

        setPoderes(data)
      },
      error: (error) => {
        setErrores([`Error leyendo CSV: ${error.message}`])
      },
    })
  }

  /* ===============================
     CRUD LOCAL
  =============================== */
  const agregarFila = () => {
    setPoderes([
      ...poderes,
      {
        cedula_otorgante: '',
        cedula_apoderado: '',
        nombre_apoderado: '',
      },
    ])
  }

  const eliminarFila = (index: number) => {
    setPoderes(poderes.filter((_, i) => i !== index))
  }

  const editarCelda = (
    index: number,
    campo: keyof PoderCSV,
    valor: string
  ) => {
    const copia = [...poderes]
    copia[index] = { ...copia[index], [campo]: valor }
    setPoderes(copia)
  }

  /* ===============================
     GUARDAR PODERES
  =============================== */
  const guardarPoderes = async () => {
    if (poderes.length === 0) {
      setErrores(['No hay poderes para guardar'])
      return
    }

    setGuardando(true)
    setErrores([])
    setMensajeExito(null)

    try {
      const response = await fetch('/api/poderes/cargueMasivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asambleaId,
          poderes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        confirm({
          title: 'Poderes creados',
          description: `${data.data.count} poderes fueron creados exitosamente`,
          confirmText: 'Aceptar',
          hideCancel: true,
          variant: 'success',
          onConfirm: () => {},
        })

        setPoderes([])
        setMensajeExito(`✓ ${data.data.count} poderes creados`)
        onExito?.(data.data.count)
      } else {
        setErrores([data.error || 'Error al guardar poderes'])
      }
    } catch (error) {
      setErrores(['Error de conexión con el servidor'])
    } finally {
      setGuardando(false)
    }
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div className="space-y-6">
      {/* Acciones */}
      <div className="flex gap-4 items-center">
        <Button
          variant="outline"
          onClick={() => document.getElementById('poderes-csv')?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Subir CSV
        </Button>

        <input
          id="poderes-csv"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] && handleUploadCSV(e.target.files[0])
          }
        />

        <Button variant="outline" onClick={agregarFila}>
          + Agregar fila
        </Button>

        {poderes.length > 0 && (
          <Button onClick={guardarPoderes} disabled={guardando}>
            <Save className="mr-2 h-4 w-4" />
            {guardando ? 'Guardando...' : `Guardar ${poderes.length} Poderes`}
          </Button>
        )}
      </div>

      {/* Éxito */}
      {mensajeExito && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-2">
          <CheckCircle className="text-green-600" />
          <p className="text-green-800 font-medium">{mensajeExito}</p>
        </div>
      )}

      {/* Errores */}
      {errores.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="text-red-600" />
            <ul className="list-disc list-inside text-sm text-red-700">
              {errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabla */}
      {poderes.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cédula Otorgante</TableHead>
                <TableHead>Cédula Apoderado</TableHead>
                <TableHead>Nombre Apoderado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {poderes.map((p, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={p.cedula_otorgante}
                      onChange={(e) =>
                        editarCelda(index, 'cedula_otorgante', e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={p.cedula_apoderado}
                      onChange={(e) =>
                        editarCelda(index, 'cedula_apoderado', e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={p.nombre_apoderado}
                      onChange={(e) =>
                        editarCelda(index, 'nombre_apoderado', e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarFila(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {Dialog}
    </div>
  )
}
