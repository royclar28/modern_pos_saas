import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ 
            where: { username },
            include: { store: true }
        });
        
        if (user && await argon2.verify(user.password, pass)) {
            // Verificar si la tienda está suspendida (excepto si el usuario es SUPER_ADMIN general, aunque los SUPER_ADMINs no deberían estar restringidos por tienda)
            if (user.store && user.store.isActive === false && user.role !== 'SUPER_ADMIN') {
                throw new UnauthorizedException('Su suscripción ha expirado. Contacte a soporte');
            }
            
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id, role: user.role, storeId: user.storeId };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async changePassword(userId: number, currentPass: string, newPass: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuario no encontrado');

        const isMatch = await argon2.verify(user.password, currentPass);
        if (!isMatch) throw new UnauthorizedException('La contraseña actual es incorrecta');

        const hashedPassword = await argon2.hash(newPass);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return true;
    }
}
