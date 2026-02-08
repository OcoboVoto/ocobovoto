// ============================================
// PROPIETARIOS
// ============================================

export interface PropietarioCSV {
    nombre: string
    cedula: string
    torre_manzana: string
    apto_casa: string
    celular?: string
    email?: string
    coeficiente: number
    cedula_apoderado?: string
    nombre_apoderado?: string 
  }
  
  export interface PropietarioValidado extends PropietarioCSV {
    errores?: string[]
  }
  
  export interface ResultadoValidacion {
    validos: PropietarioCSV[]
    invalidos: PropietarioValidado[]
    duplicados: PropietarioCSV[]
  }
  
  // ============================================
  // ASAMBLEAS
  // ============================================
  
  export type TipoAsamblea = 'ordinaria' | 'extraordinaria'
  export type ModalidadAsamblea = 'presencial' | 'virtual' | 'hibrida'
  export type EstadoAsamblea = 'borrador' | 'activa' | 'finalizada'
  
  // ============================================
  // VOTACIONES
  // ============================================
  
  export type TipoPregunta = 'binaria' | 'multiple'
  export type TipoMayoria = 'simple' | 'calificada'
  
  export interface OpcionVotacion {
    codigo: string
    texto: string
    orden: number
  }
  
  // ============================================
  // RESPONSES API
  // ============================================
  
  export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
  }

  // ============================================
  // VOTANTES
  // ============================================
  
export interface Votante {
  id: string
  cedula: string
  nombreCompleto: string
  coeficienteTotal: number
  propietariosRepresenta: number
  detalleRepresentados: any
}

// ============================================
// SUPER ADMIN
// ============================================

export interface SuperAdminData {
  id: string
  email: string
  nombre: string
}


export interface ConjuntoConAdmin {
  id: string
  nombre: string
  nit: string
  coeficienteTotal: number
  createdAt: string
  admin: {
    id: string
    email: string
    nombre: string
    activo: boolean
  } | null
  _count: {
    asambleas: number
    propietarios: number
  }
}
