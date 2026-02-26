import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

export interface LoginCredentials {
  email: string
  password: string
  conjuntoId?: string 
}

export interface AuthResult {
  success: boolean
  admin?: {
    id: string
    email: string
    nombre: string
    conjuntoId: string
    conjuntoNombre: string
  }
  //cuando tiene múltiples conjuntos y no eligió uno aún
  requiresConjuntoSelection?: boolean
  conjuntos?: { id: string; nombre: string; nit: string }[]
  adminId?: string
  error?: string
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const admin = await prisma.usuarioAdmin.findUnique({
        where: { email: credentials.email },
        include: {
          conjunto: {
            select: { id: true, nombre: true, nit: true },
          },
        },
      })

      if (!admin || !admin.activo) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      const passwordValido = await bcrypt.compare(credentials.password, admin.passwordHash)
      if (!passwordValido) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      // Sin conjuntos asignados
      if (admin.conjunto.length === 0) {
        return { success: false, error: 'No tienes conjuntos asignados. Contacta al super administrador.' }
      }

      // Con 1 solo conjunto → login directo
      if (admin.conjunto.length === 1) {
        const c = admin.conjunto[0]
        return {
          success: true,
          admin: {
            id: admin.id,
            email: admin.email,
            nombre: admin.nombre,
            conjuntoId: c.id,
            conjuntoNombre: c.nombre,
          },
        }
      }

      // Con múltiples conjuntos y ya eligió uno
      if (credentials.conjuntoId) {
        const elegido = admin.conjunto.find(c => c.id === credentials.conjuntoId)
        if (!elegido) {
          return { success: false, error: 'Conjunto no válido para este administrador' }
        }
        return {
          success: true,
          admin: {
            id: admin.id,
            email: admin.email,
            nombre: admin.nombre,
            conjuntoId: elegido.id,
            conjuntoNombre: elegido.nombre,
          },
        }
      }

      // Con múltiples conjuntos y NO eligió → pedir selección
      return {
        success: false,
        requiresConjuntoSelection: true,
        adminId: admin.id,
        conjuntos: admin.conjunto,
      }

    } catch (error) {
      console.error('Error en AuthService.login:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }
}