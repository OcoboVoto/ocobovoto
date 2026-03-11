// lib/reportes/pdf-generator.tsx
import { getAsambleaReporteData } from '@/lib/reportes/get-asamblea-reporte'
import type { ReporteAsambleaData } from '@/lib/reportes/get-asamblea-reporte'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Document, Page, View, Text, StyleSheet, Svg, Path, G, renderToBuffer } from '@react-pdf/renderer'

// Paleta de colores (igual que la web)
const OPTION_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6',
]
const NO_VOTARON_COLOR = '#fb923c'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
  header: { textAlign: 'center' as const, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#374151', marginTop: 4, textTransform: 'uppercase' },
  nit: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 6, marginBottom: 12 },
  infoGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  infoItem: { width: '48%', fontSize: 10 },
  infoLabel: { color: '#6b7280' },
  quorumGrid: { flexDirection: 'row' as const, gap: 24, marginTop: 16, flexWrap: 'wrap' as const },
  quorumBox: { flex: 1, minWidth: 120, alignItems: 'center' },
  quorumLabel: { fontSize: 9, fontWeight: 'bold', color: '#4f46e5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, fontSize: 9 },
  legendText: { marginLeft: 6, flexGrow: 1, flexShrink: 1 },
  legendValue: { width: 40, textAlign: 'right', fontWeight: 'bold' },
  legendColor: { width: 10, height: 10, backgroundColor: '#ccc' },
  asistenciaGrid: { flexDirection: 'row' as const, gap: 16 },
  asistenciaCol: { flex: 1 },
  colTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 8 },
  // Tabla asistentes (verde)
  tableHeader: { flexDirection: 'row' as const, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  tableHeaderCell: { flex: 1, padding: 4, fontSize: 9, color: '#14532d' },
  tableRow: { flexDirection: 'row' as const, borderWidth: 1, borderColor: '#bbf7d0', borderTopWidth: 0 },
  tableCell: { flex: 1, padding: 4, fontSize: 9, color: '#14532d' },
  // Tabla no asistentes (roja)
  tableHeaderRed: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  tableHeaderRedCell: { color: '#7f1d1d' },
  tableRowRed: { borderColor: '#fecaca' },
  tableCellRed: { color: '#dc2626' },
  // Tabla poderes
  poderesTable: { marginBottom: 24 },
  poderesHeader: { flexDirection: 'row' as const, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  poderesHeaderCell: { padding: 6, fontSize: 9, color: '#374151' },
  poderesRow: { flexDirection: 'row' as const, borderWidth: 1, borderColor: '#e5e7eb', borderTopWidth: 0 },
  poderesCell: { padding: 6, fontSize: 9, color: '#374151' },
  // Proposiciones
  proposicionBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 16, marginBottom: 20 },
  proposicionTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  proposicionMeta: { fontSize: 9, color: '#6b7280', marginBottom: 12 },
  proposicionContent: { flexDirection: 'row' as const, gap: 24 },
  proposicionPie: { alignItems: 'center', minWidth: 140 },
  proposicionTable: { flex: 1 },
  opcionGanadora: { fontSize: 10, color: '#374151', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  // Resumen
  resumenGrid: { flexDirection: 'row' as const, gap: 12, flexWrap: 'wrap' as const, marginBottom: 12 },
  resumenCard: { flex: 1, minWidth: 100, backgroundColor: '#f9fafb', borderRadius: 6, padding: 12, alignItems: 'center' },
  resumenLabel: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  resumenValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  // Firmas
  firmas: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row' as const, gap: 32 },
  firmaBox: { flex: 1, alignItems: 'center' },
  firmaLine: { borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 8, marginTop: 48 },
  firmaText: { fontSize: 10, fontWeight: 'bold' },
  footer: { marginTop: 24, textAlign: 'center' as const, fontSize: 9, color: '#9ca3af' },
  // Badge "Por poder"
  badgePoder: { backgroundColor: '#ede9fe', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 },
  badgePoderText: { fontSize: 7, color: '#6d28d9' },
})

function buildPiePaths(data: { value: number; color: string }[], size = 130) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 6
  const total = data.reduce((s, d) => s + d.value, 0)
  let angle = -Math.PI / 2
  const paths: { d: string; fill: string }[] = []

  data.forEach((d) => {
    const start = angle
    const sweep = total > 0 ? (d.value / total) * 2 * Math.PI : 0
    angle += sweep
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    paths.push({ d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, fill: d.color })
  })
  return paths
}

function PieChart({ data, size = 130 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  const paths = buildPiePaths(data, size)
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>{paths.map((p, i) => <Path key={i} d={p.d} fill={p.fill} stroke="#fff" strokeWidth={1.5} />)}</G>
      </Svg>
      <View style={{ width: '100%', marginTop: 8 }}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>{d.name}</Text>
            <Text style={styles.legendValue}>{d.value.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ReportePDF({ reporte }: { reporte: ReporteAsambleaData }) {
  const { asamblea, conjunto, asistentes, noAsistentes, poderes, proposiciones, resumen } = reporte

  const quorumCierre = asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null ? [
    { name: 'Al cierre', value: Number(asamblea.quorumAlCierreRegistros), color: '#f59e0b' },
    { name: 'Faltante', value: Math.max(0, 100 - Number(asamblea.quorumAlCierreRegistros)), color: '#e5e7eb' },
  ] : null

  const quorumInicial = [
    { name: asamblea.registrosCerrados ? 'Quórum total' : 'Quórum inicial', value: asamblea.quorumInicial, color: '#6366f1' },
    { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumInicial), color: '#e5e7eb' },
  ]

  const quorumFinal = asamblea.quorumFinal !== null ? [
    { name: 'Confirmados', value: asamblea.quorumFinal, color: '#22c55e' },
    { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumFinal), color: '#e5e7eb' },
  ] : null

  const secNum = (n: number) => poderes.length > 0 ? n : n - 1

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>ACTA DE ASAMBLEA</Text>
          <Text style={styles.subtitle}>{conjunto.nombre}</Text>
          <Text style={styles.nit}>NIT: {conjunto.nit}</Text>
        </View>

        {/* 1. Información general */}
        <Text style={styles.sectionTitle}>1. INFORMACIÓN GENERAL</Text>
        <View style={styles.infoGrid}>
          <Text style={styles.infoItem}><Text style={styles.infoLabel}>Tipo: </Text><Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{asamblea.tipo}</Text></Text>
          <Text style={styles.infoItem}><Text style={styles.infoLabel}>Fecha: </Text><Text style={{ fontWeight: 'bold' }}>{format(new Date(asamblea.fechaHora), "d 'de' MMMM 'de' yyyy", { locale: es })}</Text></Text>
          <Text style={styles.infoItem}><Text style={styles.infoLabel}>Modalidad: </Text><Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{asamblea.modalidad}</Text></Text>
          <Text style={styles.infoItem}><Text style={styles.infoLabel}>Estado: </Text><Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{asamblea.estado}</Text></Text>
          <Text style={styles.infoItem}><Text style={styles.infoLabel}>Quórum requerido: </Text><Text style={{ fontWeight: 'bold' }}>{asamblea.quorumRequerido}%</Text></Text>
          {asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null && (
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Quórum cierre de registro: </Text>
              <Text style={{ fontWeight: 'bold', color: Number(asamblea.quorumAlCierreRegistros) >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626' }}>
                {Number(asamblea.quorumAlCierreRegistros).toFixed(2)}%
              </Text>
            </Text>
          )}
          <Text style={styles.infoItem}>
            <Text style={styles.infoLabel}>{asamblea.registrosCerrados ? 'Quórum total acumulado: ' : 'Quórum inicial: '}</Text>
            <Text style={{ fontWeight: 'bold', color: asamblea.quorumInicial >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626' }}>
              {asamblea.quorumInicial.toFixed(2)}%
            </Text>
          </Text>
          {asamblea.quorumFinal !== null && (
            <>
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Quórum post-confirmación: </Text>
                <Text style={{ fontWeight: 'bold', color: asamblea.quorumFinal >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626' }}>
                  {asamblea.quorumFinal.toFixed(2)}%
                </Text>
              </Text>
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Variación (Q2→Q3): </Text>
                <Text style={{ fontWeight: 'bold', color: asamblea.quorumFinal < asamblea.quorumInicial ? '#dc2626' : '#16a34a' }}>
                  {(asamblea.quorumFinal - asamblea.quorumInicial).toFixed(2)}%
                </Text>
              </Text>
            </>
          )}
        </View>

        {/* Quórum charts */}
        <View style={styles.quorumGrid}>
          {quorumCierre && (
            <View style={styles.quorumBox}>
              <Text style={[styles.quorumLabel, { color: '#d97706' }]}>Quórum al Cierre</Text>
              <PieChart data={quorumCierre} size={100} />
            </View>
          )}
          <View style={styles.quorumBox}>
            <Text style={styles.quorumLabel}>{asamblea.registrosCerrados ? 'Quórum Total' : 'Quórum Inicial'}</Text>
            <PieChart data={quorumInicial} size={100} />
          </View>
          {quorumFinal && (
            <View style={styles.quorumBox}>
              <Text style={[styles.quorumLabel, { color: '#16a34a' }]}>Post-Confirmación</Text>
              <PieChart data={quorumFinal} size={100} />
            </View>
          )}
        </View>

        {/* 2. Asistencia */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2. ASISTENCIA</Text>

        {/* Subtítulos con conteo desglosado */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 9, color: '#15803d' }}>
            ✓ Asistentes: {resumen.totalAsistentes}
            {resumen.totalAsistentesPorPoder > 0
              ? `  (${resumen.totalAsistentesDirecto} directos · ${resumen.totalAsistentesPorPoder} por poder)`
              : ''}
          </Text>
          <Text style={{ fontSize: 9, color: '#dc2626' }}>
            ✗ No asistentes: {resumen.totalNoAsistentes}
          </Text>
        </View>

        <View style={styles.asistenciaGrid}>
          {/* Columna asistentes */}
          <View style={styles.asistenciaCol}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nombre</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Ubicación</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Coef.</Text>
            </View>
            {asistentes.map((a, i) => (
              <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f0fdf4' }]}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={{ fontWeight: 'bold', fontSize: 9, color: '#14532d' }}>{a.nombreCompleto}</Text>
                  {/* Badge "Por poder" con nombre del apoderado */}
                  {a.tipoAsistencia === 'por_poder' && a.apoderado && (
                    <View style={styles.badgePoder}>
                      <Text style={styles.badgePoderText}>Rep. por: {a.apoderado.nombreCompleto}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tableCell, { flex: 1 }]}>{`${a.torreManzana} ${a.aptoCasa}`}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{a.coeficiente.toFixed(4)}%</Text>
              </View>
            ))}
          </View>

          {/* Columna no asistentes */}
          <View style={styles.asistenciaCol}>
            <View style={[styles.tableHeader, styles.tableHeaderRed]}>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderRedCell, { flex: 2 }]}>Nombre</Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderRedCell, { flex: 1 }]}>Ubicación</Text>
            </View>
            {noAsistentes.map((a, i) => (
              <View key={i} style={[styles.tableRow, styles.tableRowRed, { backgroundColor: i % 2 === 0 ? '#fff' : '#fef2f2' }]}>
                <Text style={[styles.tableCell, styles.tableCellRed, { flex: 2, fontWeight: 'bold' }]}>{a.nombreCompleto}</Text>
                <Text style={[styles.tableCell, styles.tableCellRed, { flex: 1 }]}>{`${a.torreManzana} ${a.aptoCasa}`}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Poderes */}
        {poderes.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>3. PODERES OTORGADOS ({poderes.length})</Text>
            <View style={styles.poderesTable}>
              <View style={styles.poderesHeader}>
                <Text style={[styles.poderesHeaderCell, { width: 24 }]}>#</Text>
                <Text style={[styles.poderesHeaderCell, { flex: 2 }]}>Otorgante</Text>
                <Text style={[styles.poderesHeaderCell, { flex: 1 }]}>Ubicación</Text>
                <Text style={[styles.poderesHeaderCell, { width: 60, textAlign: 'right' }]}>Coef.</Text>
                <Text style={[styles.poderesHeaderCell, { flex: 1 }]}>Apoderado</Text>
                <Text style={[styles.poderesHeaderCell, { flex: 1 }]}>CC Apoderado</Text>
              </View>
              {poderes.map((p, i) => (
                <View key={i} style={[styles.poderesRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }]}>
                  <Text style={[styles.poderesCell, { width: 24, color: '#6b7280' }]}>{i + 1}</Text>
                  <View style={[styles.poderesCell, { flex: 2 }]}>
                    <Text style={{ fontWeight: 'bold' }}>{p.otorgante.nombreCompleto}</Text>
                    <Text style={{ fontSize: 8, color: '#6b7280' }}>CC: {p.otorgante.cedula}</Text>
                  </View>
                  <Text style={[styles.poderesCell, { flex: 1, fontSize: 8 }]}>{`${p.otorgante.torreManzana} ${p.otorgante.aptoCasa}`}</Text>
                  <Text style={[styles.poderesCell, { width: 60, textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }]}>{p.otorgante.coeficiente.toFixed(4)}%</Text>
                  <Text style={[styles.poderesCell, { flex: 1, fontWeight: 'bold' }]}>{p.apoderado.nombreCompleto}</Text>
                  <Text style={[styles.poderesCell, { flex: 1, color: '#6b7280' }]}>{p.apoderado.cedula}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 4. Resultados */}
        <Text style={[styles.sectionTitle, { marginTop: poderes.length > 0 ? 0 : 24 }]}>{secNum(4)}. RESULTADOS DE VOTACIONES</Text>
        {proposiciones.map((prop) => {
          const pieData = [
            ...prop.opciones.map((opc, i) => ({ name: opc.texto, value: parseFloat(opc.porcentaje.toFixed(2)), color: OPTION_COLORS[i % OPTION_COLORS.length] })),
            { name: 'No votaron', value: parseFloat(prop.noVotaron.porcentaje.toFixed(2)), color: NO_VOTARON_COLOR },
          ]
          return (
            <View key={prop.id} style={styles.proposicionBox} wrap={false}>
              <Text style={styles.proposicionTitle}>{prop.numeroOrden}. {prop.titulo}</Text>
              {prop.descripcion && <Text style={{ fontSize: 10, color: '#4b5563', marginBottom: 4 }}>{prop.descripcion}</Text>}
              <Text style={styles.proposicionMeta}>Mayoría {prop.tipoMayoria} · {prop.porcentajeRequerido}% requerido</Text>
              <View style={styles.proposicionContent}>
                <View style={styles.proposicionPie}><PieChart data={pieData} size={120} /></View>
                <View style={styles.proposicionTable}>
                  <View style={[styles.poderesHeader, { marginBottom: 0 }]}>
                    <Text style={[styles.poderesHeaderCell, { flex: 2 }]}>Opción</Text>
                    <Text style={[styles.poderesHeaderCell, { width: 50, textAlign: 'right' }]}>%</Text>
                    <Text style={[styles.poderesHeaderCell, { width: 40, textAlign: 'right' }]}>Votos</Text>
                    <Text style={[styles.poderesHeaderCell, { width: 55, textAlign: 'right' }]}>Coef.</Text>
                  </View>
                  {prop.opciones.map((opc, i) => (
                    <View key={i} style={[styles.poderesRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }]}>
                      <View style={[styles.poderesCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={[styles.legendColor, { backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length], borderRadius: 5 }]} />
                        <Text style={{ flexShrink: 1 }}>{opc.texto}</Text>
                      </View>
                      <Text style={[styles.poderesCell, { width: 55, textAlign: 'right', fontWeight: 'bold' }]}>{opc.porcentaje.toFixed(2)}%</Text>
                      <Text style={[styles.poderesCell, { width: 40, textAlign: 'right' }]}>{opc.personas}</Text>
                      <Text style={[styles.poderesCell, { width: 55, textAlign: 'right' }]}>{opc.coeficiente.toFixed(4)}%</Text>
                    </View>
                  ))}
                  <View style={[styles.poderesRow, { backgroundColor: '#fff7ed' }]}>
                    <View style={[styles.poderesCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={[styles.legendColor, { backgroundColor: NO_VOTARON_COLOR, borderRadius: 5 }]} />
                      <Text style={{ flexShrink: 1 }}>No votaron</Text>
                    </View>
                    <Text style={[styles.poderesCell, { width: 55, textAlign: 'right', fontWeight: 'bold' }]}>{prop.noVotaron.porcentaje.toFixed(2)}%</Text>
                    <Text style={[styles.poderesCell, { width: 40, textAlign: 'right' }]}>{prop.noVotaron.personas}</Text>
                    <Text style={[styles.poderesCell, { width: 55, textAlign: 'right' }]}>{prop.noVotaron.coeficiente.toFixed(4)}%</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.opcionGanadora}><Text style={{ fontWeight: 'bold' }}>Opción ganadora: </Text>{prop.opcionGanadora}</Text>
            </View>
          )
        })}

        {/* 5. Resumen */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{secNum(5)}. RESUMEN</Text>
        <View style={styles.resumenGrid}>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenLabel}>Total Propietarios</Text>
            <Text style={styles.resumenValue}>{resumen.totalPropietarios}</Text>
          </View>
          <View style={[styles.resumenCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.resumenLabel}>Asistentes</Text>
            <Text style={[styles.resumenValue, { color: '#15803d' }]}>{resumen.totalAsistentes}</Text>
            {resumen.totalAsistentesPorPoder > 0 && (
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                {resumen.totalAsistentesDirecto} directos · {resumen.totalAsistentesPorPoder} por poder
              </Text>
            )}
          </View>
          <View style={[styles.resumenCard, { backgroundColor: '#fef2f2' }]}>
            <Text style={styles.resumenLabel}>No Asistentes</Text>
            <Text style={[styles.resumenValue, { color: '#dc2626' }]}>{resumen.totalNoAsistentes}</Text>
          </View>
          <View style={[styles.resumenCard, { backgroundColor: '#eef2ff' }]}>
            <Text style={styles.resumenLabel}>Proposiciones</Text>
            <Text style={[styles.resumenValue, { color: '#4f46e5' }]}>{resumen.totalProposiciones}</Text>
          </View>
        </View>
        {resumen.totalPoderes > 0 && (
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={[styles.resumenCard, { backgroundColor: '#faf5ff', minWidth: 150 }]}>
              <Text style={styles.resumenLabel}>Poderes registrados</Text>
              <Text style={[styles.resumenValue, { color: '#7e22ce' }]}>{resumen.totalPoderes}</Text>
            </View>
          </View>
        )}

        {/* Firmas */}
        <View style={styles.firmas}>
          <View style={styles.firmaBox}><View style={styles.firmaLine}><Text style={styles.firmaText}>Presidente</Text></View></View>
          <View style={styles.firmaBox}><View style={styles.firmaLine}><Text style={styles.firmaText}>Secretario</Text></View></View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generado por OcoVoto el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generarReporteHTML(asambleaId: string): Promise<Buffer> {
  const reporte = await getAsambleaReporteData(asambleaId)
  if (!reporte) throw new Error('Asamblea no encontrada')
  return renderToBuffer(<ReportePDF reporte={reporte} />)
}