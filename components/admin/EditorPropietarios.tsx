'use client'

import { useState } from 'react'
import { Upload, Save, Plus, Trash2, AlertCircle, CheckCircle2, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import { PropietarioCSV, PropietarioValidado } from '@/types'
import { PropietariosValidator } from '@/lib/services/propietarios-validator'
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
import { useConfirmDialog } from '../hooks/useConfirmDialog'

interface EditorPropietariosProps {
  conjuntoId: string
  asambleaId?: string
  onGuardadoExitoso?: (count: number) => void
}

export function EditorPropietarios({ conjuntoId, asambleaId, onGuardadoExitoso }: EditorPropietariosProps) {
  const [propietarios, setPropietarios] = useState<PropietarioCSV[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const { confirm, Dialog } = useConfirmDialog()

  /**
   * Maneja la carga del archivo CSV
   */
  const handleUploadCSV = (file: File) => {
    setCargando(true)
    setErrores([])

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validacion = PropietariosValidator.validar(results.data)

        if (validacion.invalidos.length > 0) {
          const mensajesError = validacion.invalidos.flatMap(
            (inv) => inv.errores || []
          )
          setErrores(mensajesError)
        }

        if (validacion.duplicados.length > 0) {
          setErrores((prev) => [
            ...prev,
            `Se encontraron ${validacion.duplicados.length} cédulas duplicadas`,
          ])
        }

        setPropietarios(validacion.validos)
        setCargando(false)
      },
      error: (error) => {
        setErrores([`Error al leer el archivo: ${error.message}`])
        setCargando(false)
      },
    })
  }

  /**
   * Agrega una fila vacía
   */
  const agregarFila = () => {
    setPropietarios([
      ...propietarios,
      {
        nombre: '',
        cedula: '',
        torre_manzana: '',
        apto_casa: '',
        coeficiente: 0,
      },
    ])
  }

  /**
   * Elimina una fila
   */
  const eliminarFila = (index: number) => {
    setPropietarios(propietarios.filter((_, i) => i !== index))
  }

  /**
   * Edita un campo de una fila
   */
  const editarCelda = (index: number, campo: keyof PropietarioCSV, valor: any) => {
    const nuevos = [...propietarios]
    nuevos[index] = {
      ...nuevos[index],
      [campo]: valor,
    }
    setPropietarios(nuevos)
  }

  /**
   * Guarda los propietarios en la base de datos
   */
  const guardarPropietarios = async () => {
    if (propietarios.length === 0) {
      setErrores(['No hay propietarios para guardar'])
      return
    }

    setGuardando(true)
    setErrores([])
    setMensajeExito(null)

    try {
      const response = await fetch('/api/propietarios/agregar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conjuntoId,
          asambleaId,
          propietarios,
        }),
      })

      const data = await response.json()

      if (data.success) {
        confirm({
          title: 'Propietarios Guardados.',
          description: ` ${data.data.count} propietarios guardados exitosamente`,
          confirmText: 'Aceptar',
          variant: 'success',
          hideCancel: true,
          onConfirm: () => { },
        })
        setPropietarios([])
        setMensajeExito(`✓ ${data.data.count} propietarios guardados exitosamente`)
        setTimeout(() => setMensajeExito(null), 5000)
        onGuardadoExitoso?.(data.data.count)
      }  else {
        const nuevosErrores = data.data?.errores || [data.error || 'Error al guardar']
        setErrores(nuevosErrores)
        setMostrarErrores(true)
        setTimeout(() => {
          setMostrarErrores(false)
          setErrores([])
        }, 7000)
      }
    } catch (error) {
      setErrores(['Error de conexión. Intenta nuevamente.'])
    } finally {
      setGuardando(false)
    }
  }

  const coeficienteTotal = PropietariosValidator.calcularCoeficienteTotal(propietarios)

  return (
    <div className="space-y-6">
      {/* Barra de acciones */}
      <div className="flex gap-4 items-center">
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={cargando}
        >
          <Upload className="mr-2 h-4 w-4" />
          {cargando ? 'Cargando...' : 'Subir CSV'}
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUploadCSV(e.target.files[0])}
        />

        <Button variant="outline" onClick={agregarFila}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Fila
        </Button>

        {propietarios.length > 0 && (
          <Button onClick={guardarPropietarios} disabled={guardando}>
            <Save className="mr-2 h-4 w-4" />
            {guardando ? 'Guardando...' : `Guardar ${propietarios.length} Propietarios`}
          </Button>
        )}

        {propietarios.length > 0 && (
          <div className="ml-auto text-sm text-gray-600">
            <strong>Coeficiente Total:</strong> {coeficienteTotal.toFixed(4)}%
          </div>
        )}
      </div>

      {/* MENSAJE DE ÉXITO */}
      {mensajeExito && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{mensajeExito}</p>
        </div>
      )}

      {/* Mensajes de error */}
      {mostrarErrores && errores.length > 0 && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 transition-opacity duration-500 ${
          mostrarErrores ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">
                Se encontraron {errores.length} errores:
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {errores.map((err, i) => (
                  <li key={i} className="text-red-700 text-sm">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE INICIAL CON ENLACE CORREGIDO */}
      {propietarios.length === 0 && errores.length === 0 && !mensajeExito && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="font-semibold text-blue-900 mb-2">
            Sube un archivo CSV o agrega propietarios manualmente
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            El CSV debe tener las columnas: Nombre, Cédula, Torre o Manzana, Apto o Casa, Coeficiente
          </p>
          <a
            href="/plantilla-propietarios.csv"
            download
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            📥 Descargar plantilla CSV de ejemplo
          </a>
        </div>
      )}

      {/* Tabla de propietarios */}
      {propietarios.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nombre</TableHead>
                <TableHead className="w-[120px]">Cédula</TableHead>
                <TableHead className="w-[120px]">Torre/Manzana</TableHead>
                <TableHead className="w-[100px]">Apto/Casa</TableHead>
                <TableHead className="w-[100px]">Coeficiente</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propietarios.map((prop, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={prop.nombre}
                      onChange={(e) => editarCelda(index, 'nombre', e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={prop.cedula}
                      onChange={(e) => editarCelda(index, 'cedula', e.target.value)}
                      placeholder="1234567890"
                      maxLength={12}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={prop.torre_manzana}
                      onChange={(e) => editarCelda(index, 'torre_manzana', e.target.value)}
                      placeholder="Torre A"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={prop.apto_casa}
                      onChange={(e) => editarCelda(index, 'apto_casa', e.target.value)}
                      placeholder="101"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={prop.coeficiente}
                      onChange={(e) => editarCelda(index, 'coeficiente', parseFloat(e.target.value) || 0)}
                      type="number"
                      step="0.01"
                      min="0"
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