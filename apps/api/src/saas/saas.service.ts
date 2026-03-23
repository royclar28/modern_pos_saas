import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import * as argon2 from 'argon2';

@Injectable()
export class SaasService {
    private readonly logger = new Logger(SaasService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) {}

    async getStores(skip: number = 0, take: number = 10) {
        const [items, total] = await Promise.all([
            this.prisma.store.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.store.count()
        ]);
        return { items, total };
    }

    async toggleStoreStatus(storeId: string, isActive: boolean) {
        return this.prisma.store.update({
            where: { id: storeId },
            data: { isActive }
        });
    }

    async createStore(name: string, rif: string, ownerEmail: string) {
        // En un caso real se envuelve en una transacción
        const temporaryPassword = Math.random().toString(36).slice(-8); // generar clave de 8 caracteres
        const hashedPassword = await argon2.hash(temporaryPassword);

        // Crear tienda
        const store = await this.prisma.store.create({
            data: {
                name,
                rif,
                ownerEmail,
                plan: 'PRO', // O el plan default que desees
                isActive: true
            }
        });

        // Crear dueño
        const username = ownerEmail;
        let owner = await this.prisma.user.findUnique({
            where: { username }
        });

        if (owner) {
            // El usuario ya existe, simplemente actualizamos la contraseña temporal
            // y lo asignamos como dueño de esta nueva tienda.
            owner = await this.prisma.user.update({
                where: { username },
                data: {
                    storeId: store.id,
                    password: hashedPassword,
                    role: 'STORE_ADMIN'
                }
            });
        } else {
            // Crear usuario nuevo
            owner = await this.prisma.user.create({
                data: {
                    storeId: store.id,
                    username,
                    password: hashedPassword,
                    email: ownerEmail,
                    role: 'STORE_ADMIN',
                    firstName: 'Dueño',
                    lastName: name,
                }
            });
        }

        // 3. Simular servicio de emailing y enviar correo real con Resend
        try {
            await this.emailService.sendWelcomeEmail(ownerEmail, store.name, temporaryPassword);
        } catch (error) {
            this.logger.error(`Falló el envío del correo a ${ownerEmail}. Procediendo igualmente...`, error);
        }

        return { store, ownerId: owner.id, temporaryPassword };
    }
}
