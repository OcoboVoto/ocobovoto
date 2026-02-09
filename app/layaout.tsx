import { Analytics } from '@vercel/analytics/react'
import type { ReactNode } from 'react'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}