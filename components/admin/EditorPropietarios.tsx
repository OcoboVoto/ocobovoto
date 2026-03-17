//components/admin/EditorPropietarios.tsx
'use client'

import { useState } from 'react'
import { Upload, Save, Plus, Trash2, AlertCircle, CheckCircle2, CheckCircle, X } from 'lucide-react'
import Papa from 'papaparse'
import { PropietarioCSV } from '@/types'
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
import * as XLSX from 'xlsx'

interface EditorPropietariosProps {
  conjuntoId: string
  asambleaId?: string
  onGuardadoExitoso?: (count: number) => void
}
const ITEMS_POR_PAGINA = 15

export function EditorPropietarios({ conjuntoId, asambleaId, onGuardadoExitoso }: EditorPropietariosProps) {
  const [propietarios, setPropietarios] = useState<PropietarioCSV[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [progresoCarga, setProgresoCarga] = useState({ procesados: 0, total: 0 })
  const [mensajeCarga, setMensajeCarga] = useState('Procesando propietarios')
  const { confirm, Dialog } = useConfirmDialog()


  /**  
   * Procesa los datos parseados (común para CSV y Excel)  
   */
  const procesarDatos = async (data: any[]) => {
    const total = data.length
    setProgresoCarga({ procesados: 0, total })

    // Procesar en chunks para no bloquear el UI y mostrar progreso  
    const CHUNK_SIZE = 50
    const chunks = []
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      chunks.push(data.slice(i, i + CHUNK_SIZE))
    }

    let todosValidos: PropietarioCSV[] = []
    let todosInvalidos: any[] = []
    let procesados = 0

    for (const chunk of chunks) {
      const validacion = PropietariosValidator.validar(chunk)
      todosValidos = [...todosValidos, ...validacion.validos]
      todosInvalidos = [...todosInvalidos, ...validacion.invalidos]
      procesados += chunk.length
      setProgresoCarga({ procesados, total })

      // Yield al event loop para que el UI se actualice  
      await new Promise((r) => setTimeout(r, 0))
    }

    const mensajesError: string[] = []

    if (todosInvalidos.length > 0) {
      mensajesError.push(
        ...todosInvalidos.flatMap((inv) => inv.errores || [])
      )
    }

    if (mensajesError.length > 0) {
      setErrores(mensajesError)
      setMostrarErrores(true)
    }

    setPropietarios(todosValidos)
    setPaginaActual(1)
    setCargando(false)
    setProgresoCarga({ procesados: 0, total: 0 })
  }

  /**  
   * Maneja la carga del archivo CSV  
   */
  const handleUploadCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => procesarDatos(results.data),
      error: (error) => {
        setErrores([`Error al leer el archivo CSV: ${error.message}`])
        setCargando(false)
      },
    })
  }

  /**  
   * Maneja la carga del archivo Excel (.xlsx, .xls)  
   */
  const handleUploadExcel = (file: File) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Tomar la primera hoja  
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        // Convertir a JSON con headers  
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        if (jsonData.length === 0) {
          setErrores(['El archivo Excel está vacío o no tiene datos válidos'])
          setCargando(false)
          return
        }

        // Normalizar headers: el Excel puede tener headers con mayúsculas,  
        // espacios, tildes, etc. Los mapeamos al formato esperado.  
        const datosNormalizados = jsonData.map((row: any) => {
          const normalized: any = {}

          Object.keys(row).forEach((key) => {
            const cleanKey = key
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // quitar tildes  

            // Mapear variantes comunes al formato esperado  
            if (cleanKey.includes('nombre')) {
              normalized.nombre = String(row[key]).trim()
            } else if (cleanKey.includes('cedula') || cleanKey.includes('documento') || cleanKey.includes('identificacion')) {
              normalized.cedula = String(row[key]).trim()
            } else if (cleanKey.includes('torre') || cleanKey.includes('manzana')) {
              normalized.torre_manzana = String(row[key]).trim()
            } else if (cleanKey.includes('apto') || cleanKey.includes('casa') || cleanKey.includes('apartamento') || cleanKey.includes('unidad')) {
              normalized.apto_casa = String(row[key]).trim()
            } else if (cleanKey.includes('coeficiente') || cleanKey.includes('coef')) {
              normalized.coeficiente = parseFloat(row[key]) || 0
            }
          })

          return normalized
        })

        procesarDatos(datosNormalizados)
      } catch (error) {
        setErrores(['Error al leer el archivo Excel. Verifica que el formato sea correcto.'])
        setCargando(false)
      }
    }

    reader.onerror = () => {
      setErrores(['Error al leer el archivo'])
      setCargando(false)
    }

    reader.readAsArrayBuffer(file)
  }

  /**
   * Maneja la carga del archivo CSV
   */
  /**  
    * Detecta el tipo de archivo y lo procesa  
    */
  const handleFileUpload = (file: File) => {
    setCargando(true)
    setErrores([])
    setMostrarErrores(false)
    setMensajeCarga('Procesando archivo')

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      handleUploadCSV(file)
    } else if (extension === 'xlsx' || extension === 'xls') {
      handleUploadExcel(file)
    } else {
      setErrores(['Formato no soportado. Usa archivos .csv, .xlsx o .xls'])
      setCargando(false)
    }
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
    setCargando(true)
    setMensajeCarga('Guardando propietarios')
    setProgresoCarga({ procesados: 0, total: propietarios.length })
    setErrores([])
    setMensajeExito(null)

    try {
      // Guardar en chunks para mostrar progreso real
      const CHUNK_SIZE = 30
      const chunks = []
      for (let i = 0; i < propietarios.length; i += CHUNK_SIZE) {
        chunks.push(propietarios.slice(i, i + CHUNK_SIZE))
      }

      let totalGuardados = 0
      let erroresAcumulados: string[] = []

      for (const chunk of chunks) {
        const response = await fetch('/api/propietarios/agregar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conjuntoId,
            asambleaId,
            propietarios: chunk,
          }),
        })

        const data = await response.json()

        if (data.success) {
          totalGuardados += data.data.count
        } else {
          const nuevosErrores = data.data?.errores || [data.error || 'Error al guardar']
          erroresAcumulados = [...erroresAcumulados, ...nuevosErrores]
          totalGuardados += data.data?.guardados || 0
        }

        setProgresoCarga({ procesados: totalGuardados, total: propietarios.length })
      }

      if (erroresAcumulados.length > 0) {
        setErrores(erroresAcumulados)
        setMostrarErrores(true)

        if (totalGuardados > 0) {
          setMensajeExito(`✓ ${totalGuardados} propietarios guardados (con algunos errores)`)
          setTimeout(() => setMensajeExito(null), 5000)
        }
      } else {
        confirm({
          title: 'Propietarios Guardados',
          description: `${totalGuardados} propietarios guardados exitosamente`,
          confirmText: 'Aceptar',
          variant: 'success',
          hideCancel: true,
          onConfirm: () => { },
        })
        setPropietarios([])
        setPaginaActual(1)
        setMensajeExito(`✓ ${totalGuardados} propietarios guardados exitosamente`)
        setTimeout(() => setMensajeExito(null), 5000)
        onGuardadoExitoso?.(totalGuardados)
      }
    } catch (error) {
      setErrores(['Error de conexión. Intenta nuevamente.'])
      setMostrarErrores(true)
    } finally {
      setGuardando(false)
      setCargando(false)
      setProgresoCarga({ procesados: 0, total: 0 })
    }
  }

  const coeficienteTotal = PropietariosValidator.calcularCoeficienteTotal(propietarios)

  // Agregar estos cálculos antes del return  
  const totalPaginas = Math.ceil(propietarios.length / ITEMS_POR_PAGINA)
  const propietariosPaginados = propietarios.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  // Resetear a página 1 cuando cambian los propietarios  
  const handleFileUploadOriginal = handleFileUpload

  return (
    <div className="space-y-6 relative">
      {/*Overlay de carga con progreso */}
      {cargando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {mensajeCarga}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Esto puede tomar unos segundos...
              </p>
            </div>

            {progresoCarga.total > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((progresoCarga.procesados / progresoCarga.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm font-medium text-indigo-600">
                  {progresoCarga.procesados} de {progresoCarga.total} registros
                  <span className="text-gray-400 ml-2">
                    ({Math.round((progresoCarga.procesados / progresoCarga.total) * 100)}%)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex gap-4 items-center">
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={cargando}
        >
          <Upload className="mr-2 h-4 w-4" />
          {cargando ? 'Cargando...' : 'Subir Excel'}
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
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

      {/* Mensajes de error*/}
      {mostrarErrores && errores.length > 0 && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 transition-opacity duration-500 ${mostrarErrores ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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
            <button
              onClick={() => {
                setMostrarErrores(false)
                setErrores([])
              }}
              className="flex-shrink-0 p-1 rounded-md hover:bg-red-100 transition-colors"
              aria-label="Cerrar errores"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* MENSAJE INICIAL */}
      {propietarios.length === 0 && errores.length === 0 && !mensajeExito && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="font-semibold text-blue-900 mb-2">
            Sube un archivo CSV o excel, o agrega propietarios manualmente
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            El archivo debe tener las columnas: Nombre, Cédula, Torre o Manzana, Apto o Casa, Coeficiente
          </p>
          <a
            href="/plantilla-propietarios.xlsx"
            download
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            📥 Descargar plantilla de ejemplo
          </a>
        </div>
      )}

      {/* Tabla de propietarios */}
      {propietarios.length > 0 && (
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="w-[200px]">Nombre</TableHead>
                  <TableHead className="w-[120px]">Cédula</TableHead>
                  <TableHead className="w-[120px]">Torre/Manzana</TableHead>
                  <TableHead className="w-[100px]">Apto/Casa</TableHead>
                  <TableHead className="w-[100px]">Coeficiente</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propietariosPaginados.map((prop, index) => {
                  const indexReal = (paginaActual - 1) * ITEMS_POR_PAGINA + index
                  return (
                    <TableRow key={indexReal}>
                      <TableCell className="text-center text-sm text-gray-400 font-mono">
                        {indexReal + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.nombre}
                          onChange={(e) => editarCelda(indexReal, 'nombre', e.target.value)}
                          placeholder="Nombre completo"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.cedula}
                          onChange={(e) => editarCelda(indexReal, 'cedula', e.target.value)}
                          placeholder="1234567890"
                          maxLength={12}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.torre_manzana}
                          onChange={(e) => editarCelda(indexReal, 'torre_manzana', e.target.value)}
                          placeholder="Torre A"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.apto_casa}
                          onChange={(e) => editarCelda(indexReal, 'apto_casa', e.target.value)}
                          placeholder="101"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.coeficiente}
                          onChange={(e) => editarCelda(indexReal, 'coeficiente', parseFloat(e.target.value) || 0)}
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            eliminarFila(indexReal)
                            // Si la página actual queda vacía, retroceder
                            const nuevoTotal = propietarios.length - 1
                            const nuevasTotalPaginas = Math.ceil(nuevoTotal / ITEMS_POR_PAGINA)
                            if (paginaActual > nuevasTotalPaginas && nuevasTotalPaginas > 0) {
                              setPaginaActual(nuevasTotalPaginas)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-gray-500">
                Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1}-{Math.min(paginaActual * ITEMS_POR_PAGINA, propietarios.length)} de {propietarios.length} propietarios
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(1)}
                  disabled={paginaActual === 1}
                  className="h-8 px-2"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="h-8 px-3"
                >
                  ‹
                </Button>

                {/* Números de página */}
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((page) => {
                    // Mostrar: primera, última, actual, y ±1 de la actual
                    return (
                      page === 1 ||
                      page === totalPaginas ||
                      Math.abs(page - paginaActual) <= 1
                    )
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    // Agregar "..." entre páginas no consecutivas
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(page)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant={paginaActual === item ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaginaActual(item as number)}
                        className="h-8 w-8 p-0"
                      >
                        {item}
                      </Button>
                    )
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="h-8 px-3"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(totalPaginas)}
                  disabled={paginaActual === totalPaginas}
                  className="h-8 px-2"
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {Dialog}
    </div>
  )
}