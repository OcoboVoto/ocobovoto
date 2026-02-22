//app/api/super/enviar-reporte/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generarReporteHTML } from '@/lib/pdf-generator'
import { render } from '@react-email/render'
import ReporteAsambleaEmail from '@/emails/reporte-asamblea'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ApiResponse } from '@/types'
import { transporter } from '@/lib/mailer/mailer'
import { getAsambleaReporteData } from '@/lib/reportes/get-asamblea-reporte'


export async function POST(request: NextRequest) {
  try {
    // Verificar que es super admin
    const sessionCookie = request.cookies.get('super-admin-session')

    if (!sessionCookie) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No autenticado como super admin',
      }, { status: 401 })
    }

    const body = await request.json()
    const { asambleaId, emailDestino } = body

    if (!asambleaId || !emailDestino) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'asambleaId y emailDestino son requeridos',
      }, { status: 400 })
    }

    const reporte = await getAsambleaReporteData(asambleaId)

    if (!reporte) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Asamblea no encontrada',
      }, { status: 404 })
    }

    // Generar HTML del PDF
    const pdfBuffer = await generarReporteHTML(asambleaId)


    // Preparar URL del reporte (para el botón del email)
    const reporteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/reportes/${asambleaId}`

    // Renderizar el email a HTML
    const emailHtml = await render(
      ReporteAsambleaEmail({
        conjuntoNombre: reporte.conjunto.nombre,
        tipoAsamblea: reporte.asamblea.tipo,
        fecha: format(new Date(reporte.asamblea.fechaHora), "d 'de' MMMM 'de' yyyy", { locale: es }),
        quorumInicial: Number(reporte.asamblea.quorumInicial),
        totalVotantes: reporte.resumen.totalAsistentes,
        totalProposiciones: reporte.resumen.totalProposiciones,
        pdfUrl: reporteUrl,
      }),
    )


    // Enviar email
    const infoEmail = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: emailDestino,
      subject: `Acta de Asamblea - ${reporte.conjunto.nombre}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Acta_Asamblea_${reporte.conjunto.nombre.replace(/\s/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { emailId: infoEmail },
      message: 'Email enviado exitosamente',
    })

  } catch (error) {
    console.error('Error en POST /api/super/enviar-reporte:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 })

  }
}