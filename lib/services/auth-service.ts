import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

export interface LoginCredentials {
  email: string
  password: string
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
  error?: string
}

export class AuthService {
  /**
   * Valida credenciales de admin y retorna datos si es válido
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Buscar admin por email
      const admin = await prisma.usuarioAdmin.findUnique({
        where: { email: credentials.email },
        include: {
          conjunto: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      })

      if (!admin) {
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

      // Verificar password
      const passwordValido = await bcrypt.compare(
        credentials.password,
        admin.passwordHash
      )

      if (!passwordValido) {
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

      return {
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          nombre: admin.nombre,
          conjuntoId: admin.conjuntoId,
          conjuntoNombre: admin.conjunto.nombre,
        },
      }
    } catch (error) {
      console.error('Error en AuthService.login:', error)
      return {
        success: false,
        error: 'Error interno del servidor',
      }
    }
  }

  /**
   * Crea un hash de password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }
}