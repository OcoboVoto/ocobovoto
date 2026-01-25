import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const conjunto = await prisma.conjunto.findFirst({
    where: { nit: '900123456-7' },
  })

  if (conjunto) {
    console.log('\n ID del Conjunto:')
    console.log(conjunto.id)
    console.log('\nCopia este ID y pégalo en app/admin/propietarios/page.tsx')
  } else {
    console.log(' No se encontró el conjunto. Ejecuta: npm run prisma:seed')
  }
}

main()
  .finally(() => prisma.$disconnect())