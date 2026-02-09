import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version,
    })
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return Response.json({
      status: 'unhealthy',
      error: errorMessage,
    }, { status: 503 })
  }
}