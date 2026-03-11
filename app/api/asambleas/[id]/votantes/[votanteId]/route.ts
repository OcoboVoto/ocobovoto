// app/api/asambleas/[id]/votantes/[votanteId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { publishToChannel } from '@/lib/ably/server'
import { ABLY_CHANNELS, ABLY_EVENTS } from '@/lib/ably/channel-names'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; votanteId: string }> }) {
    try {
        const { id: asambleaId, votanteId } = await params

        // 1. Obtener el votante con toda la info necesaria
        const votante = await prisma.votante.findUnique({
            where: { id: votanteId },
            select: {
                id: true,
                cedula: true,
                nombreCompleto: true,
                coeficienteTotal: true,
                asambleaId: true,
            },
        })

        if (!votante) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Votante no encontrado' },
                { status: 404 }
            )
        }

        if (votante.asambleaId !== asambleaId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'El votante no pertenece a esta asamblea' },
                { status: 403 }
            )
        }

        // 2. Verificar que la asamblea está activa o en borrador (no finalizada)
        const asamblea = await prisma.asamblea.findUnique({
            where: { id: asambleaId },
            select: {
                estado: true,
                conjunto: { select: { coeficienteTotal: true } },
            },
        })

        if (!asamblea) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Asamblea no encontrada' },
                { status: 404 }
            )
        }

        if (asamblea.estado === 'finalizada') {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'No se puede anular registros de una asamblea finalizada' },
                { status: 400 }
            )
        }

        // 3. Verificar que el votante no tiene votos emitidos
        const votosEmitidos = await prisma.voto.count({
            where: { votanteId },
        })

        if (votosEmitidos > 0) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: `Este votante ya emitió ${votosEmitidos} voto(s). No es posible anular el registro.`,
                },
                { status: 400 }
            )
        }

        // 4. Transacción: eliminar Votante + RegistroAsamblea + recalcular quórum
        const resultado = await prisma.$transaction(async (tx) => {
            // Eliminar confirmación de asistencia si existe
            await tx.confirmacionAsistencia.deleteMany({
                where: { votanteId, asambleaId },
            })

            // Eliminar RegistroAsamblea (propietarios internos tienen este registro)
            await tx.registroAsamblea.deleteMany({
                where: {
                    asambleaId,
                    cedulaRegistrante: votante.cedula,
                },
            })

            // Eliminar el Votante
            await tx.votante.delete({
                where: { id: votanteId },
            })

            // Recalcular quórum inicial
            const suma = await tx.votante.aggregate({
                where: { asambleaId },
                _sum: { coeficienteTotal: true },
                _count: { id: true },
            })

            const coeficientePresente = Number(suma._sum.coeficienteTotal ?? 0)
            const coeficienteTotalConjunto = Number(asamblea.conjunto.coeficienteTotal)
            const nuevoQuorum =
                coeficienteTotalConjunto > 0
                    ? (coeficientePresente / coeficienteTotalConjunto) * 100
                    : 0

            await tx.asamblea.update({
                where: { id: asambleaId },
                data: { quorumInicial: nuevoQuorum },
            })

            return {
                votanteEliminado: votante.nombreCompleto,
                quorumActual: nuevoQuorum,
                totalVotantes: suma._count.id,
            }
        })

        // 5. Notificar en tiempo real
        await publishToChannel(ABLY_CHANNELS.asamblea(asambleaId), ABLY_EVENTS.ASAMBLEA_UPDATE, {
            tipo: 'registro-anulado',
            quorumActual: resultado.quorumActual,
            timestamp: new Date().toISOString(),
        })

        return NextResponse.json<ApiResponse>({
            success: true,
            data: resultado,
            message: `Registro de "${resultado.votanteEliminado}" anulado correctamente`,
        })
    } catch (error) {
        console.error('Error en DELETE /api/asambleas/[id]/votantes/[votanteId]:', error)
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Error interno al anular el registro' },
            { status: 500 }
        )
    }
}