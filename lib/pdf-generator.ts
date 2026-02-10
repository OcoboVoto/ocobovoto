import { prisma } from '@/lib/prisma'
import { generarPDFDesdeHTML } from './utils/pdf-from-html'

export async function generarReporteHTML(asambleaId: string): Promise<any> {
  // Obtener datos completos de la asamblea
  const asamblea = await prisma.asamblea.findUnique({
    where: { id: asambleaId },
    include: {
      conjunto: true,
      votantes: true,
      proposiciones: {
        include: {
          opciones: {
            include: {
              votos: true,
            },
          },
        },
        orderBy: { numeroOrden: 'asc' },
      },
    },
  })

  if (!asamblea) {
    throw new Error('Asamblea no encontrada')
  }

  // Obtener todos los propietarios
  const todosPropietarios = await prisma.propietario.findMany({
    where: {
      conjuntoId: asamblea.conjuntoId,
      activo: true,
    },
    orderBy: [
      { torreManzana: 'asc' },
      { aptoCasa: 'asc' },
    ],
  })

  const cedulasAsistentes = new Set(asamblea.votantes.map(v => v.cedula))
  const asistentes = todosPropietarios.filter(p => cedulasAsistentes.has(p.cedula))
  const noAsistentes = todosPropietarios.filter(p => !cedulasAsistentes.has(p.cedula))

  // Generar HTML completo
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    .header h1 {
      margin: 0;
      color: #0f172a;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      background: #0f172a;
      color: white;
      padding: 10px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
      background: #f8fafc;
      border-left: 4px solid #0f172a;
    }
    .firma {
      margin-top: 60px;
      text-align: center;
      border-top: 1px solid #333;
      padding-top: 10px;
      display: inline-block;
      width: 300px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ACTA DE ASAMBLEA</h1>
    <h2>${asamblea.conjunto.nombre}</h2>
    <p>NIT: ${asamblea.conjunto.nit}</p>
    <p>${new Date(asamblea.fechaHora).toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })}</p>
  </div>

  <div class="section">
    <h2>1. INFORMACIÓN GENERAL</h2>
    <div class="info-grid">
      <div class="info-item"><strong>Tipo:</strong> ${asamblea.tipo}</div>
      <div class="info-item"><strong>Modalidad:</strong> ${asamblea.modalidad}</div>
      <div class="info-item"><strong>Quórum Requerido:</strong> ${asamblea.quorumRequerido}%</div>
      <div class="info-item"><strong>Quórum Inicial:</strong> ${asamblea.quorumInicial.toFixed(2)}%</div>
      ${asamblea.quorumFinal ? `
      <div class="info-item"><strong>Quórum Final:</strong> ${asamblea.quorumFinal.toFixed(2)}%</div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <h2>2. ASISTENCIA</h2>
    <h3>Asistentes (${asistentes.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Ubicación</th>
          <th>Coeficiente</th>
        </tr>
      </thead>
      <tbody>
        ${asistentes.map(a => `
          <tr>
            <td>${a.nombreCompleto}</td>
            <td>${a.torreManzana} ${a.aptoCasa}</td>
            <td>${a.coeficiente}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3>No Asistentes (${noAsistentes.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Ubicación</th>
        </tr>
      </thead>
      <tbody>
        ${noAsistentes.map(a => `
          <tr>
            <td>${a.nombreCompleto}</td>
            <td>${a.torreManzana} ${a.aptoCasa}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>3. RESULTADOS DE VOTACIONES</h2>
    ${asamblea.proposiciones.map(prop => {
      const totalVotantes = asamblea.votantes.length
      const coeficientePresente = asamblea.votantes.reduce((sum, v) => sum + Number(v.coeficienteTotal), 0)
      
      return `
        <h3>${prop.numeroOrden}. ${prop.titulo}</h3>
        <p>${prop.descripcion}</p>
        <table>
          <thead>
            <tr>
              <th>Opción</th>
              <th>Votos</th>
              <th>Coeficiente</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            ${prop.opciones.map(opc => {
              const coef = opc.votos.reduce((sum, v) => sum + Number(v.coeficienteAplicado), 0)
              const porc = (coef / coeficientePresente) * 100
              return `
                <tr>
                  <td>${opc.texto}</td>
                  <td>${opc.votos.length}</td>
                  <td>${coef.toFixed(2)}%</td>
                  <td>${porc.toFixed(2)}%</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      `
    }).join('')}
  </div>

  <div style="margin-top: 80px; display: flex; justify-content: space-around;">
    <div class="firma">
      <strong>Presidente</strong>
    </div>
    <div class="firma">
      <strong>Secretario</strong>
    </div>
  </div>

  <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px;">
    Generado por OcoVoto el ${new Date().toLocaleDateString('es-CO')}
  </p>
</body>
</html>
  `
  const pdfBuffer = await generarPDFDesdeHTML(html)
  return pdfBuffer
}