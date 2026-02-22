import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, } from '@react-email/components'

interface ReporteAsambleaEmailProps {
  conjuntoNombre: string
  tipoAsamblea: string
  fecha: string
  quorumInicial: number
  totalVotantes: number
  totalProposiciones: number
  pdfUrl: string
}

export default function ReporteAsambleaEmail({
  conjuntoNombre = 'Conjunto Residencial',
  tipoAsamblea = 'ordinaria',
  fecha = '1 de enero de 2024',
  quorumInicial = 0,
  totalVotantes = 0,
  totalProposiciones = 0,
  pdfUrl = '#',
}: ReporteAsambleaEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reporte de Asamblea - {conjuntoNombre}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* HEADER */}
          <Section style={header}>
            <Img
              src="https://ocobovoto.vercel.app/icon_pink.png"
              width="56"
              height="56"
              alt="OcoVoto"
              style={logo}
            />
            <Heading style={h1}>OcoVoto</Heading>
            <Text style={headerText}>Sistema de Votación Digital</Text>
          </Section>

          {/* DIVIDER */}
          <Section style={divider} />

          {/* CONTENT */}
          <Section style={content}>
            <Heading style={h2}>Reporte de Asamblea</Heading>

            <Text style={paragraph}>
              Se adjunta el acta completa de la asamblea realizada. Puedes abrir el documento completo en el siguiente botón.
            </Text>

            <Section style={infoBox}>
              <Row label="Conjunto" value={conjuntoNombre} />
              <Row label="Tipo de Asamblea" value={tipoAsamblea} capitalize />
              <Row label="Fecha" value={fecha} />
              <Row label="Quórum Inicial" value={`${quorumInicial.toFixed(2)}%`} />
              <Row label="Total Votantes" value={String(totalVotantes)} />
              <Row label="Total Proposiciones" value={String(totalProposiciones)} />
            </Section>
            {/* 
            <Section style={buttonContainer}>
              <Link href={pdfUrl} style={button}>
                Ver acta completa
              </Link>
            </Section> 
            */}
            <Text style={footer}>
              Este es un correo automático generado por OcoVoto.
              <br />
              Por favor no responder a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* COMPONENTE ROW PARA LIMPIAR UI */
function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <Section style={{ marginBottom: 12 }}>
      <Text style={infoLabel}>{label}</Text>
      <Text style={{ ...infoValue, textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </Text>
    </Section>
  )
}

/* ================== ESTILOS ================== */

const main = {
  backgroundColor: '#0b1220',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#0f172a',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '620px',
  borderRadius: '16px',
  overflow: 'hidden',
}

const header = {
  background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
  padding: '40px 32px 32px',
  textAlign: 'center' as const,
}

const logo = {
  display: 'block',
  margin: '0 auto 12px auto',
  borderRadius: 14,
  boxShadow: '0 8px 24px rgba(236,72,153,0.35)',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  margin: '0',
}

const headerText = {
  color: '#94a3b8',
  fontSize: '14px',
  margin: '6px 0 0',
}

const divider = {
  height: '1px',
  backgroundColor: '#1e293b',
}

const content = {
  padding: '32px',
  backgroundColor: '#020617',
}

const h2 = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#cbd5e1',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const infoBox = {
  backgroundColor: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '28px',
}

const infoLabel = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0 0 2px',
  letterSpacing: '0.3px',
  textTransform: 'uppercase' as const,
}

const infoValue = {
  color: '#ffffff',
  fontSize: '15px',
  margin: '0',
  fontWeight: '500',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const button = {
  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '14px 28px',
  boxShadow: '0 8px 24px rgba(236,72,153,0.35)',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '24px',
  textAlign: 'center' as const,
}