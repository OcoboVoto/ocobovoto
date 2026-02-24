// components/resultados-vivo/GraficoTorta.tsx

'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface DatosGrafico {
  nombre: string
  valor: number
  porcentaje: number
  color: string
}

interface GraficoTortaProps {
  datos: DatosGrafico[]
  titulo?: string
}

export function GraficoTorta({ datos, titulo }: GraficoTortaProps) {
  // Filtrar datos con valor > 0 para mejor visualización
  const datosFiltrados = datos.filter(d => d.valor > 0)

  if (datosFiltrados.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400">
        Sin votos aún
      </div>
    )
  }

  // Formatear label del tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-semibold">{data.nombre}</p>
          <p className="text-sm text-gray-600">
            Votos: {data.valor}
          </p>
          <p className="text-sm text-gray-600">
            Porcentaje: {data.porcentaje.toFixed(2)}%
          </p>
        </div>
      )
    }
    return null
  }

  // Formatear label de la leyenda
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">
              {entry.value}: {entry.payload.porcentaje.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="w-full">
      {titulo && (
        <h3 className="text-center font-semibold text-gray-700 mb-4">
          {titulo}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={datosFiltrados}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="valor"
            nameKey="nombre"
          >
            {datosFiltrados.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}