import { getAsambleaReporteData } from '@/lib/reportes/get-asamblea-reporte'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import chromium from '@sparticuz/chromium-min'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'

// Paleta de colores (igual que la web)
const OPTION_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6',
]
const NO_VOTARON_COLOR = '#fb923c'

/** Chrome en Windows para desarrollo local (@sparticuz/chromium-min no funciona en Windows) */
function getChromePathWindows(): string | null {
  const candidates = [
    path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

function buildSvgPie(data: { value: number; color: string }[], size = 160): string {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6
  const total = data.reduce((s, d) => s + d.value, 0)
  let angle = -Math.PI / 2
  const paths: string[] = []

  data.forEach((d) => {
    const start = angle
    const sweep = total > 0 ? (d.value / total) * 2 * Math.PI : 0
    angle += sweep
    const end = angle
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = sweep > Math.PI ? 1 : 0
    const mid = start + sweep / 2
    const lx = cx + r * 0.65 * Math.cos(mid)
    const ly = cy + r * 0.65 * Math.sin(mid)
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    const label = sweep > 0.15
      ? `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="11" font-weight="700">${d.value.toFixed(1)}%</text>`
      : ''
    paths.push(`<path d="${path}" fill="${d.color}" stroke="white" stroke-width="1.5"/>${label}`)
  })

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`
}

function buildLegendHtml(items: { name: string; value: number; color: string }[]): string {
  return items.map(d => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;">
      <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${d.color};flex-shrink:0;"></span>
      <span style="color:#374151;">${d.name}</span>
      <span style="margin-left:auto;font-weight:600;color:#111827;">${d.value.toFixed(1)}%</span>
    </div>
  `).join('')
}

export async function generarReporteHTML(asambleaId: string): Promise<Buffer> {
  const reporte = await getAsambleaReporteData(asambleaId)
  if (!reporte) throw new Error('Asamblea no encontrada')

  const { asamblea, conjunto, asistentes, noAsistentes, poderes, proposiciones, resumen } = reporte

  //  Quórum data 
  const quorumCierre = asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null
    ? [
      { name: 'Al cierre', value: Number(asamblea.quorumAlCierreRegistros), color: '#f59e0b' },
      { name: 'Faltante', value: Math.max(0, 100 - Number(asamblea.quorumAlCierreRegistros)), color: '#e5e7eb' },
    ]
    : null

  const quorumInicial = [
    { name: asamblea.registrosCerrados ? 'Quórum total' : 'Quórum inicial', value: asamblea.quorumInicial, color: '#6366f1' },
    { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumInicial), color: '#e5e7eb' },
  ]

  const quorumFinal = asamblea.quorumFinal !== null
    ? [
      { name: 'Confirmados', value: asamblea.quorumFinal, color: '#22c55e' },
      { name: 'Faltante', value: Math.max(0, 100 - asamblea.quorumFinal), color: '#e5e7eb' },
    ]
    : null

  const numQuorums = [quorumCierre, true, quorumFinal].filter(Boolean).length
  const quorumGridCols = numQuorums === 3 ? '1fr 1fr 1fr' : numQuorums === 2 ? '1fr 1fr' : '200px'

  //  Sección quórum 
  const quorumSectionHtml = `
    <div style="display:grid;grid-template-columns:${quorumGridCols};gap:24px;margin-top:24px;">
      ${quorumCierre ? `
        <div style="text-align:center;">
          <p style="font-size:11px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Quórum al Cierre</p>
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            ${buildSvgPie(quorumCierre, 130)}
            <div style="width:100%;">${buildLegendHtml(quorumCierre)}</div>
          </div>
        </div>
      ` : ''}
      <div style="text-align:center;">
        <p style="font-size:11px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
          ${asamblea.registrosCerrados ? 'Quórum Total' : 'Quórum Inicial'}
        </p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
          ${buildSvgPie(quorumInicial, 130)}
          <div style="width:100%;">${buildLegendHtml(quorumInicial)}</div>
        </div>
      </div>
      ${quorumFinal ? `
        <div style="text-align:center;">
          <p style="font-size:11px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Post-Confirmación</p>
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            ${buildSvgPie(quorumFinal, 130)}
            <div style="width:100%;">${buildLegendHtml(quorumFinal)}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `

  //  Sección asistentes 
  const asistentesRows = asistentes.map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f0fdf4'};">
      <td style="padding:4px 8px;border:1px solid #bbf7d0;color:#14532d;font-weight:500;">${a.nombreCompleto}</td>
      <td style="padding:4px 8px;border:1px solid #bbf7d0;color:#15803d;">${a.torreManzana} ${a.aptoCasa}</td>
      <td style="padding:4px 8px;border:1px solid #bbf7d0;text-align:right;color:#15803d;">${a.coeficiente.toFixed(4)}%</td>
    </tr>
  `).join('')

  const noAsistentesRows = noAsistentes.map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fef2f2'};">
      <td style="padding:4px 8px;border:1px solid #fecaca;color:#7f1d1d;font-weight:500;">${a.nombreCompleto}</td>
      <td style="padding:4px 8px;border:1px solid #fecaca;color:#dc2626;">${a.torreManzana} ${a.aptoCasa}</td>
    </tr>
  `).join('')

  //  Sección poderes ─
  const poderesSection = poderes.length > 0 ? `
    <section style="margin-bottom:32px;page-break-inside:avoid;">
      <h3 style="font-size:16px;font-weight:600;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:16px;">
        3. PODERES OTORGADOS (${poderes.length})
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;">#</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;">Otorgante</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;">Ubicación</th>
            <th style="text-align:right;padding:6px 8px;border:1px solid #d1d5db;">Coef.</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;">Apoderado</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;">CC Apoderado</th>
          </tr>
        </thead>
        <tbody>
          ${poderes.map((p, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
              <td style="padding:6px 8px;border:1px solid #e5e7eb;color:#6b7280;">${i + 1}</td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;">
                <div style="font-weight:500;">${p.otorgante.nombreCompleto}</div>
                <div style="font-size:10px;color:#6b7280;">CC: ${p.otorgante.cedula}</div>
              </td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;color:#6b7280;font-size:10px;">${p.otorgante.torreManzana} ${p.otorgante.aptoCasa}</td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:500;color:#4f46e5;">${p.otorgante.coeficiente.toFixed(4)}%</td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;font-weight:500;">${p.apoderado.nombreCompleto}</td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;color:#6b7280;">${p.apoderado.cedula}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  ` : ''

  const secNum = (n: number) => poderes.length > 0 ? n : n - 1

  //  Sección proposiciones ─
  const proposicionesHtml = proposiciones.map((prop) => {
    const pieData = [
      ...prop.opciones.map((opc, i) => ({
        name: opc.texto,
        value: parseFloat(opc.porcentaje.toFixed(2)),
        color: OPTION_COLORS[i % OPTION_COLORS.length],
      })),
      { name: 'No votaron', value: parseFloat(prop.noVotaron.porcentaje.toFixed(2)), color: NO_VOTARON_COLOR },
    ]

    const opcionesRows = prop.opciones.map((opc, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
        <td style="padding:5px 8px;border:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${OPTION_COLORS[i % OPTION_COLORS.length]};flex-shrink:0;"></span>
            ${opc.texto}
          </div>
        </td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${opc.porcentaje.toFixed(2)}%</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${opc.personas}</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${opc.coeficiente.toFixed(4)}%</td>
      </tr>
    `).join('')

    return `
      <div style="border:1px solid #d1d5db;border-radius:8px;padding:20px;margin-bottom:24px;page-break-inside:avoid;">
        <div style="margin-bottom:16px;">
          <h4 style="font-weight:600;color:#111827;margin:0 0 4px;">${prop.numeroOrden}. ${prop.titulo}</h4>
          ${prop.descripcion ? `<p style="font-size:13px;color:#4b5563;margin:0 0 4px;">${prop.descripcion}</p>` : ''}
          <p style="font-size:11px;color:#6b7280;margin:0;">Mayoría ${prop.tipoMayoria} · ${prop.porcentajeRequerido}% requerido</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            ${buildSvgPie(pieData, 160)}
            <div style="width:100%;">${buildLegendHtml(pieData)}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;align-self:start;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="text-align:left;padding:5px 8px;border:1px solid #d1d5db;">Opción</th>
                <th style="text-align:right;padding:5px 8px;border:1px solid #d1d5db;">%</th>
                <th style="text-align:right;padding:5px 8px;border:1px solid #d1d5db;">Votos</th>
                <th style="text-align:right;padding:5px 8px;border:1px solid #d1d5db;">Coef.</th>
              </tr>
            </thead>
            <tbody>
              ${opcionesRows}
              <tr style="background:#fff7ed;">
                <td style="padding:5px 8px;border:1px solid #e5e7eb;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${NO_VOTARON_COLOR};flex-shrink:0;"></span>
                    No votaron
                  </div>
                </td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${prop.noVotaron.porcentaje.toFixed(2)}%</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${prop.noVotaron.personas}</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${prop.noVotaron.coeficiente.toFixed(4)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style="font-size:13px;color:#374151;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
          <strong>Opción ganadora:</strong> ${prop.opcionGanadora}
        </p>
      </div>
    `
  }).join('')

  //  HTML completo 
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111827; background: #fff; padding: 32px; }
    h3 { font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
    section { margin-bottom: 32px; }
    table { border-collapse: collapse; }
    @page { size: A4; margin: 20mm 15mm; }
  </style>
</head>
<body>

  <!-- Encabezado -->
  <div style="text-align:center;margin-bottom:32px;border-bottom:1px solid #e5e7eb;padding-bottom:24px;">
    <h1 style="font-size:22px;font-weight:700;color:#111827;">ACTA DE ASAMBLEA</h1>
    <h2 style="font-size:18px;color:#374151;margin-top:4px;text-transform:uppercase;">${conjunto.nombre}</h2>
    <p style="font-size:12px;color:#6b7280;margin-top:4px;">NIT: ${conjunto.nit}</p>
  </div>

  <!-- 1. Información general -->
  <section>
    <h3>1. INFORMACIÓN GENERAL</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
      <div><span style="color:#6b7280;">Tipo:</span> <strong style="text-transform:capitalize;">${asamblea.tipo}</strong></div>
      <div><span style="color:#6b7280;">Fecha:</span> <strong>${format(new Date(asamblea.fechaHora), "d 'de' MMMM 'de' yyyy", { locale: es })}</strong></div>
      <div><span style="color:#6b7280;">Modalidad:</span> <strong style="text-transform:capitalize;">${asamblea.modalidad}</strong></div>
      <div><span style="color:#6b7280;">Estado:</span> <strong style="text-transform:capitalize;">${asamblea.estado}</strong></div>
      <div><span style="color:#6b7280;">Quórum requerido:</span> <strong>${asamblea.quorumRequerido}%</strong></div>
      ${asamblea.registrosCerrados && asamblea.quorumAlCierreRegistros !== null ? `
        <div>
          <span style="color:#6b7280;">Quórum cierre de registro:</span>
          <strong style="color:${Number(asamblea.quorumAlCierreRegistros) >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626'};">
            ${Number(asamblea.quorumAlCierreRegistros).toFixed(2)}%
          </strong>
          ${asamblea.fechaCierreRegistros ? `<span style="font-size:11px;color:#9ca3af;">(${format(new Date(asamblea.fechaCierreRegistros), 'HH:mm', { locale: es })})</span>` : ''}
        </div>
      ` : ''}
      <div>
        <span style="color:#6b7280;">${asamblea.registrosCerrados ? 'Quórum total acumulado:' : 'Quórum inicial:'}</span>
        <strong style="color:${asamblea.quorumInicial >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626'};">
          ${asamblea.quorumInicial.toFixed(2)}%
        </strong>
      </div>
      ${asamblea.quorumFinal !== null ? `
        <div>
          <span style="color:#6b7280;">Quórum post-confirmación:</span>
          <strong style="color:${asamblea.quorumFinal >= asamblea.quorumRequerido ? '#16a34a' : '#dc2626'};">
            ${asamblea.quorumFinal.toFixed(2)}%
          </strong>
        </div>
        <div>
          <span style="color:#6b7280;">Variación (Q2→Q3):</span>
          <strong style="color:${asamblea.quorumFinal < asamblea.quorumInicial ? '#dc2626' : '#16a34a'};">
            ${(asamblea.quorumFinal - asamblea.quorumInicial).toFixed(2)}%
          </strong>
        </div>
      ` : ''}
    </div>
    ${quorumSectionHtml}
  </section>

  <!-- 2. Asistencia -->
  <section>
    <h3>2. ASISTENCIA</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <h4 style="font-weight:600;color:#15803d;margin-bottom:12px;">Asistentes (${asistentes.length})</h4>
        <table style="width:100%;font-size:11px;">
          <thead>
            <tr style="background:#dcfce7;">
              <th style="text-align:left;padding:4px 8px;border:1px solid #86efac;color:#14532d;">Nombre</th>
              <th style="text-align:left;padding:4px 8px;border:1px solid #86efac;color:#14532d;">Ubicación</th>
              <th style="text-align:right;padding:4px 8px;border:1px solid #86efac;color:#14532d;">Coef.</th>
            </tr>
          </thead>
          <tbody>${asistentesRows}</tbody>
        </table>
      </div>
      <div>
        <h4 style="font-weight:600;color:#dc2626;margin-bottom:12px;">No Asistentes (${noAsistentes.length})</h4>
        <table style="width:100%;font-size:11px;">
          <thead>
            <tr style="background:#fee2e2;">
              <th style="text-align:left;padding:4px 8px;border:1px solid #fca5a5;color:#7f1d1d;">Nombre</th>
              <th style="text-align:left;padding:4px 8px;border:1px solid #fca5a5;color:#7f1d1d;">Ubicación</th>
            </tr>
          </thead>
          <tbody>${noAsistentesRows}</tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- 3. Poderes (condicional) -->
  ${poderesSection}

  <!-- Votaciones -->
  <section>
    <h3>${secNum(4)}. RESULTADOS DE VOTACIONES</h3>
    ${proposicionesHtml}
  </section>

  <!-- Resumen -->
  <section style="page-break-inside:avoid;">
    <h3>${secNum(5)}. RESUMEN</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center;">
      <div style="background:#f9fafb;border-radius:8px;padding:16px;">
        <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">Total Propietarios</p>
        <p style="font-size:24px;font-weight:700;color:#111827;">${resumen.totalPropietarios}</p>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;">
        <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">Asistentes</p>
        <p style="font-size:24px;font-weight:700;color:#15803d;">${resumen.totalAsistentes}</p>
      </div>
      <div style="background:#fef2f2;border-radius:8px;padding:16px;">
        <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">No Asistentes</p>
        <p style="font-size:24px;font-weight:700;color:#dc2626;">${resumen.totalNoAsistentes}</p>
      </div>
      <div style="background:#eef2ff;border-radius:8px;padding:16px;">
        <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">Proposiciones</p>
        <p style="font-size:24px;font-weight:700;color:#4f46e5;">${resumen.totalProposiciones}</p>
      </div>
    </div>
    ${resumen.totalPoderes > 0 ? `
      <div style="margin-top:12px;text-align:center;">
        <div style="display:inline-block;background:#faf5ff;border-radius:8px;padding:12px 24px;">
          <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">Poderes registrados</p>
          <p style="font-size:24px;font-weight:700;color:#7e22ce;">${resumen.totalPoderes}</p>
        </div>
      </div>
    ` : ''}
  </section>

  <!-- Firmas -->
  <div style="margin-top:48px;padding-top:32px;border-top:1px solid #e5e7eb;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #9ca3af;padding-top:8px;margin-top:64px;">
          <p style="font-size:13px;font-weight:500;">Presidente</p>
        </div>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #9ca3af;padding-top:8px;margin-top:64px;">
          <p style="font-size:13px;font-weight:500;">Secretario</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top:32px;text-align:center;font-size:11px;color:#9ca3af;">
    <p>Generado por OcoVoto el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
  </div>

</body>
</html>
  `

  //  Renderizar con Puppeteer 

  const isLocal = process.env.NODE_ENV === 'development'
  const isWindows = process.platform === 'win32'
  let executablePath: string
  if (isLocal && isWindows) {
    const winChrome = getChromePathWindows()
    if (!winChrome) throw new Error('Chrome no encontrado. Instala Google Chrome para generar PDFs en desarrollo.')
    executablePath = winChrome
  } else {
    executablePath = await chromium.executablePath()
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: !isLocal,
    defaultViewport: null, // pantalla completa
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  })
  await browser.close()
  return Buffer.from(pdfBuffer)
}