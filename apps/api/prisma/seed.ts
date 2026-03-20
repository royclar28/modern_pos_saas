import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando semilla (seed)...');

  // 1. Crear o reutilizar tienda por defecto
  const store = await prisma.store.upsert({
    where: { id: 'default-store' },
    update: {},
    create: {
      id: 'default-store',
      name: 'Bodega Principal',
      primaryColor: '#8B5CF6',
    },
  });
  console.log(`✅ Tienda creada/encontrada: ${store.name} (ID: ${store.id})`);

  // 2. Encriptar contraseña para el usuario base
  const hashedPassword = await argon2.hash('123456');

  // 3. Crear o reutilizar usuario administrador base asociado a la tienda
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin@merx.com' },
    update: {},
    create: {
      username: 'admin@merx.com',
      email: 'admin@merx.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      storeId: store.id,
    },
  });
  console.log(`✅ Usuario creado/encontrado: ${adminUser.username} (Rol: ${adminUser.role})`);
  
  console.log('Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

