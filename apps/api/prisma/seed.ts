import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Seed Super Admin User
    const hashedPassword = await argon2.hash('123456');

    const superAdmin = await prisma.employee.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@pos.com',
            role: Role.SUPER_ADMIN,
        },
    });
    console.log('Super Admin user created:', superAdmin.username);

    // 2. Migrate legacy 'ospos_app_config' default values to StoreConfig
    const legacyConfigs = [
        { key: 'currency_symbol', value: '$' },
        { key: 'default_tax_rate', value: '8' },
        { key: 'language', value: 'es' },
        { key: 'company', value: 'Open Source Point of Sale' },
        { key: 'timezone', value: 'America/New_York' },
    ];

    for (const config of legacyConfigs) {
        const upserted = await prisma.storeConfig.upsert({
            where: { key: config.key },
            update: {},
            create: {
                key: config.key,
                value: config.value,
            },
        });
        console.log(`Config [${upserted.key}]: ${upserted.value}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
