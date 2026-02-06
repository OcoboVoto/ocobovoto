import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
  } from '@react-email/components'
  
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
            <Section style={header}>
              <Heading style={h1}>OcoboVoto</Heading>
              <Text style={headerText}>Sistema de Votación Digital</Text>
            </Section>
  
            <Section style={content}>
              <Heading style={h2}>Reporte de Asamblea</Heading>
              
              <Text style={paragraph}>
                Se adjunta el acta completa de la asamblea realizada.
              </Text>
  
              <Section style={infoBox}>
                <Text style={infoLabel}>Conjunto:</Text>
                <Text style={infoValue}>{conjuntoNombre}</Text>

                <Text style={infoLabel}>Tipo de Asamblea:</Text>
                <Text style={{ ...infoValue, textTransform: 'capitalize' }}>
                  {tipoAsamblea}
                </Text>

                <Text style={infoLabel}>Fecha:</Text>
                <Text style={infoValue}>{fecha}</Text>
  
                <Text style={infoLabel}>Quórum Inicial:</Text>
                <Text style={infoValue}>{quorumInicial.toFixed(2)}%</Text>
  
                <Text style={infoLabel}>Total Votantes:</Text>
                <Text style={infoValue}>{totalVotantes}</Text>
  
                <Text style={infoLabel}>Total Proposiciones:</Text>
                <Text style={infoValue}>{totalProposiciones}</Text>
              </Section>
  
              <Section style={buttonContainer}>
                <Link href={pdfUrl} style={button}>
                  Ver Reporte Completo
                </Link>
              </Section>
  
              <Text style={footer}>
                Este es un correo automático generado por OcoboVoto.
                <br />
                Por favor no responder a este mensaje.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    )
  }
  
  // Estilos
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  }
  
  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
  }
  
  const header = {
    backgroundColor: '#0f172a',
    padding: '32px',
    textAlign: 'center' as const,
  }
  
  const h1 = {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0',
    padding: '0',
  }
  
  const headerText = {
    color: '#cbd5e1',
    fontSize: '14px',
    margin: '8px 0 0',
  }
  
  const content = {
    padding: '32px',
  }
  
  const h2 = {
    color: '#1e293b',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 24px',
  }
  
  const paragraph = {
    color: '#475569',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 24px',
  }
  
  const infoBox = {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  }
  
  const infoLabel = {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 4px',
  }
  
  const infoValue = {
    color: '#1e293b',
    fontSize: '16px',
    margin: '0 0 16px',
    fontWeight: '500',
  }
  
  const buttonContainer = {
    textAlign: 'center' as const,
    marginBottom: '32px',
  }
  
  const button = {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '16px 32px',
  }
  
  const footer = {
    color: '#94a3b8',
    fontSize: '12px',
    lineHeight: '18px',
    marginTop: '32px',
    textAlign: 'center' as const,
  }