// app/api/propietarios/[id]/bloqueo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// PATCH /api/propietarios/[id]/bloqueo
// Body: { bloqueadoParaVotar: boolean, motivoBloqueo?: string }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { bloqueadoParaVotar, motivoBloqueo } = await request.json()

        if (typeof bloqueadoParaVotar !== 'boolean') {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'El campo bloqueadoParaVotar es requerido y debe ser boolean',
            }, { status: 400 })
        }

        const propietario = await prisma.propietario.update({
            where: { id },
            data: {
                bloqueadoParaVotar,
                // Al desbloquear, limpiar el motivo. Al bloquear, usar el motivo enviado o el default.
                motivoBloqueo: bloqueadoParaVotar
                    ? (motivoBloqueo?.trim() || 'Mora en cuotas de administración')
                    : null,
            },
            select: {
                id: true,
                nombreCompleto: true,
                cedula: true,
                bloqueadoParaVotar: true,
                motivoBloqueo: true,
            },
        })

        return NextResponse.json<ApiResponse>({
            success: true,
            data: propietario,
        })
    } catch (error) {
        console.error('Error en PATCH /api/propietarios/[id]/bloqueo:', error)
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Error al actualizar el bloqueo',
        }, { status: 500 })
    }
}