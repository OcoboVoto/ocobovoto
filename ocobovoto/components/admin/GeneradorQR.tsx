'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GeneradorQRProps {
  asambleaId: string
  qrCodeData: string
  url: string
}

export function GeneradorQR({ asambleaId, qrCodeData, url}: GeneradorQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      // URL que los votantes escanearán
      //const registroUrl = `${window.location.origin}/registro/${asambleaId}`
      
      QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    }
  }, [asambleaId])
  
  const titulo = url.includes('registro') ? 'Código QR de Registro' : 'Código QR de Votación'

  const descargarQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `QR-Asamblea-${asambleaId}.png`
      link.href = url
      link.click()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">{titulo}</h3>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <canvas ref={canvasRef} />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            {url.includes('registro') ? 'Los asistentes deben escanear este código para registrarse' : 
            'Los asistentes deben escanear este código para votar en la asamblea'}
          </p>
          <p className="text-xs text-gray-500 font-mono">
            {`${url}`}
          </p>
        </div>

        <Button onClick={descargarQR} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descargar QR
        </Button>
      </div>
    </div>
  )
}