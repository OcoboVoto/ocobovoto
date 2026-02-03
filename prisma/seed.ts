import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

   //0. Crear Super Admin
   const superAdminPassword = await bcrypt.hash('superadmin123', 10)
   const superAdmin = await prisma.superAdmin.upsert({
     where: { email: 'superadmin@votoasamblea.com' },
     update: {},
     create: {
       email: 'superadmin@votoasamblea.com',
       passwordHash: superAdminPassword,
       nombre: 'Super Administrador',
     },
   })
   console.log('✅ Super Admin creado:', superAdmin.email)

  // 1. Crear Conjunto de prueba
  const conjunto = await prisma.conjunto.upsert({
    where: { nit: '900123456-7' },
    update: {},
    create: {
      nombre: 'Conjunto Residencial Las Acacias',
      nit: '900123456-7',
      coeficienteTotal: 100.0000,
    },
  })
  console.log('Conjunto creado:', conjunto.nombre)

  // 2. Crear Usuario Admin
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.usuarioAdmin.upsert({
    where: { email: 'admin@acacias.com' },
    update: {},
    create: {
      conjuntoId: conjunto.id,
      email: 'admin@acacias.com',
      passwordHash,
      nombre: 'Administrador Principal',
    },
  })
  console.log('✅ Admin creado:', admin.email)

  // 3. Crear Propietarios de prueba
  const propietarios = [
    {
      torreManzana: 'Torre A',
      aptoCasa: '101',
      nombreCompleto: 'Juan Pérez',
      cedula: '1234567890',
      celular: '3001234567',
      email: 'juan@email.com',
      coeficiente: 2.5,
    },
    {
      torreManzana: 'Torre A',
      aptoCasa: '102',
      nombreCompleto: 'María López',
      cedula: '9876543210',
      celular: '3109876543',
      email: 'maria@email.com',
      coeficiente: 2.5,
    },
    {
      torreManzana: 'Torre B',
      aptoCasa: '201',
      nombreCompleto: 'Carlos Ramírez',
      cedula: '5555555555',
      celular: '3205555555',
      email: 'carlos@email.com',
      coeficiente: 3.0,
    },
  ]

  for (const prop of propietarios) {
    await prisma.propietario.upsert({
      where: { cedula: prop.cedula },
      update: {},
      create: {
        ...prop,
        conjuntoId: conjunto.id,
      },
    })
  }
  console.log(' 3 propietarios creados')

  console.log('Seed completado!')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })