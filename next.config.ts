import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Optimizaciones de producción
  output: 'standalone',
  
  // Compresión de assets
  compress: true,
  
  // Optimización de imágenes
  images: {
    domains: ['[PROJECT-REF].supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Configuración de experimentales para mejor performance
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
