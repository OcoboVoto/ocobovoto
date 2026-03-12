// app/api/poderes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: poderId } = await params
        const body = await request.json()
        const { asambleaId, nombreApoderado, cedulaApoderado } = body

        if (!asambleaId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'asambleaId es requerido' },
                { status: 400 }
            )
        }

        if (!nombreApoderado?.trim() && !cedulaApoderado?.trim()) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Debes proporcionar al menos un campo a actualizar' },
                { status: 400 }
            )
        }

        const poder = await prisma.poder.findUnique({
            where: { id: poderId },
            select: { id: true, asambleaId: true, cedulaApoderado: true, nombreApoderado: true, propietarioOtorganteId: true },
        })

        if (!poder) {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Poder no encontrado' }, { status: 404 })
        }

        if (poder.asambleaId !== asambleaId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'El poder no pertenece a esta asamblea' },
                { status: 403 }
            )
        }

        // Si cambia la cédula, verificar que no esté ya registrada
        if (cedulaApoderado && cedulaApoderado !== poder.cedulaApoderado) {
            const yaRegistrado = await prisma.votante.findUnique({
                where: { asambleaId_cedula: { asambleaId, cedula: cedulaApoderado } },
            })
            if (yaRegistrado) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: `La cédula ${cedulaApoderado} ya tiene un votante registrado en esta asamblea` },
                    { status: 400 }
                )
            }

            const poderDuplicado = await prisma.poder.findFirst({
                where: {
                    asambleaId,
                    cedulaApoderado,
                    propietarioOtorganteId: poder.propietarioOtorganteId,
                    id: { not: poderId },
                    activo: true,
                },
            })
            if (poderDuplicado) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: `Este otorgante ya tiene un poder activo para el apoderado con cédula ${cedulaApoderado}` },
                    { status: 400 }
                )
            }
        }

        const poderActualizado = await prisma.poder.update({
            where: { id: poderId },
            data: {
                ...(nombreApoderado?.trim() && { nombreApoderado: nombreApoderado.trim() }),
                ...(cedulaApoderado?.trim() && { cedulaApoderado: cedulaApoderado.trim() }),
            },
            include: {
                propietarioOtorgante: {
                    select: { id: true, nombreCompleto: true, cedula: true, torreManzana: true, aptoCasa: true, coeficiente: true },
                },
            },
        })

        return NextResponse.json<ApiResponse>({
            success: true,
            data: poderActualizado,
            message: 'Poder actualizado correctamente',
        })
    } catch (error) {
        console.error('Error en PATCH /api/poderes/[id]:', error)
        return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno al actualizar el poder' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: poderId } = await params
        const body = await request.json()
        const { asambleaId } = body

        if (!asambleaId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'asambleaId es requerido' },
                { status: 400 }
            )
        }

        const poder = await prisma.poder.findUnique({
            where: { id: poderId },
            select: { id: true, asambleaId: true, cedulaApoderado: true, nombreApoderado: true },
        })

        if (!poder) {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Poder no encontrado' }, { status: 404 })
        }

        if (poder.asambleaId !== asambleaId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'El poder no pertenece a esta asamblea' },
                { status: 403 }
            )
        }

        // Bloquear si el apoderado ya está registrado como votante
        const votanteRegistrado = await prisma.votante.findUnique({
            where: { asambleaId_cedula: { asambleaId, cedula: poder.cedulaApoderado } },
        })

        if (votanteRegistrado) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: `El apoderado "${poder.nombreApoderado}" ya está registrado como votante. Primero anula su registro.`,
                },
                { status: 400 }
            )
        }

        await prisma.poder.delete({
            where: { id: poderId }
        })

        return NextResponse.json<ApiResponse>({
            success: true,
            message: `Poder de "${poder.nombreApoderado}" eliminado correctamente`,
        })
    } catch (error) {
        console.error('Error en DELETE /api/poderes/[id]:', error)
        return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno al eliminar el poder' }, { status: 500 })
    }
}