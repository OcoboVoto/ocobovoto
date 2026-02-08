import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { asambleaId, poderes } = body

        if (!asambleaId || !Array.isArray(poderes)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Datos inválidos',
            }, { status: 400 })
        }

        const errores: any[] = []
        const creados: any[] = []

        await prisma.$transaction(async (tx) => {
            for (const [index, row] of poderes.entries()) {
                const { cedula_otorgante, cedula_apoderado, nombre_apoderado } = row

                if (!cedula_otorgante || !cedula_apoderado || !nombre_apoderado) {
                    errores.push({
                        fila: index + 1,
                        error: 'Campos obligatorios incompletos',
                    })
                    continue
                }

                const otorgante = await tx.propietario.findUnique({
                    where: { cedula: cedula_otorgante },
                })

                if (!otorgante) {
                    errores.push({
                        fila: index + 1,
                        cedula_otorgante,
                        error: 'Otorgante no existe',
                    })
                    continue
                }

                const yaExiste = await tx.poder.findUnique({
                    where: {
                        propietarioOtorganteId_asambleaId: {
                            propietarioOtorganteId: otorgante.id,
                            asambleaId,
                        },
                    },
                })

                if (yaExiste) {
                    errores.push({
                        fila: index + 1,
                        cedula_otorgante,
                        error: 'Ya tiene poder en esta asamblea',
                    })
                    continue
                }

                const poder = await tx.poder.create({
                    data: {
                        propietarioOtorganteId: otorgante.id,
                        asambleaId,
                        cedulaApoderado: cedula_apoderado,
                        nombreApoderado: nombre_apoderado,
                        activo: true,
                    },
                })

                creados.push(poder)
            }
        })

        return NextResponse.json<ApiResponse>({
            success: true,
            message: `Poderes creados: ${creados.length}`,
            data: {
                creados: creados.length,
                errores,
            },
        })

    } catch (error) {
        console.error('Error en POST /api/poderes/cargueMasivo:', error)
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Error al cargar poderes',
        }, { status: 500 })
    }
}
