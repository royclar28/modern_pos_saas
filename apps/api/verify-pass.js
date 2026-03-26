const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'admin@merx.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  const match = await argon2.verify(user.password, '123456');
  console.log(`Password '123456' matches: ${match}`);
  
  // Try another common one just in case
  const match2 = await argon2.verify(user.password, 'admin');
  console.log(`Password 'admin' matches: ${match2}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
