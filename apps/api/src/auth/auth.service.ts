import { Injectable } from '@nestjs/common';
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
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (user && await argon2.verify(user.password, pass)) {
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
}
