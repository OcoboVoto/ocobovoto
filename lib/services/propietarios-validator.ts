import { PropietarioCSV, PropietarioValidado, ResultadoValidacion } from '@/types'

export class PropietariosValidator {
  /**
   * Valida un array de propietarios desde CSV
   */
  static validar(propietarios: any[]): ResultadoValidacion {
    const validos: PropietarioCSV[] = []
    const invalidos: PropietarioValidado[] = []
    const cedulasRegistradas = new Set<string>()
    const duplicados: PropietarioCSV[] = []

    propietarios.forEach((prop, index) => {
      const errores: string[] = []
      const filaNum = index + 2 // +2 porque Excel empieza en 1 y hay header

      // Validación: Nombre requerido
      if (!prop.nombre || prop.nombre.trim() === '') {
        errores.push(`Fila ${filaNum}: El nombre es obligatorio`)
      }

      // Validación: Cédula requerida
      if (!prop.cedula || prop.cedula.toString().trim() === '') {
        errores.push(`Fila ${filaNum}: La cédula es obligatoria`)
      } else {
        const cedula = prop.cedula.toString().trim()
        if (cedula.length < 6 || cedula.length > 12) {
          errores.push(`Fila ${filaNum}: Cédula debe tener entre 6 y 12 dígitos`)
        }

        // Detectar duplicados
        if (cedulasRegistradas.has(cedula)) {
          errores.push(`Fila ${filaNum}: Cédula duplicada`)
          duplicados.push(this.normalizarPropietario(prop))
        } else {
          cedulasRegistradas.add(cedula)
        }
      }

      // Validación: Torre/Manzana requerida
      if (!prop.torre_manzana || prop.torre_manzana.trim() === '') {
        errores.push(`Fila ${filaNum}: Torre/Manzana es obligatoria`)
      }

      // Validación: Apto/Casa requerido
      if (!prop.apto_casa || prop.apto_casa.trim() === '') {
        errores.push(`Fila ${filaNum}: Apto/Casa es obligatorio`)
      }

      // Validación: Coeficiente válido
      const coeficiente = parseFloat(prop.coeficiente)
      if (isNaN(coeficiente) || coeficiente <= 0) {
        errores.push(`Fila ${filaNum}: Coeficiente debe ser un número mayor a 0`)
      }

      // Validación: Email (si está presente)
      if (prop.email && !this.validarEmail(prop.email)) {
        errores.push(`Fila ${filaNum}: Email inválido`)
      }

      // Validación: Celular (si está presente)
      if (prop.celular && !this.validarCelular(prop.celular)) {
        errores.push(`Fila ${filaNum}: Celular debe tener 10 dígitos y empezar con 3`)
      }

      // Clasificar
      if (errores.length > 0) {
        invalidos.push({
          ...this.normalizarPropietario(prop),
          errores,
        })
      } else {
        validos.push(this.normalizarPropietario(prop))
      }
    })

    return { validos, invalidos, duplicados }
  }

  /**
   * Normaliza los datos del propietario
   */
  private static normalizarPropietario(prop: any): PropietarioCSV {
    return {
      nombre: prop.nombre?.trim() || '',
      cedula: prop.cedula?.toString().trim() || '',
      torre_manzana: prop.torre_manzana?.trim() || '',
      apto_casa: prop.apto_casa?.trim() || '',
      celular: prop.celular?.toString().trim() || undefined,
      email: prop.email?.trim() || undefined,
      coeficiente: parseFloat(prop.coeficiente) || 0,
      cedula_apoderado: prop.cedula_apoderado?.toString().trim() || undefined,
      nombre_apoderado: prop.nombre_apoderado?.trim() || undefined,
    }
  }

  /**
   * Valida formato de email
   */
  private static validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  /**
   * Valida formato de celular colombiano
   */
  private static validarCelular(celular: string): boolean {
    const cleaned = celular.toString().replace(/\D/g, '')
    return cleaned.length === 10 && cleaned.startsWith('3')
  }

  /**
   * Calcula el total de coeficientes
   */
  static calcularCoeficienteTotal(propietarios: PropietarioCSV[]): number {
    return propietarios.reduce((sum, prop) => sum + prop.coeficiente, 0)
  }
}