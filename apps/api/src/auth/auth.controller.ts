import { Controller, Post, Body, UnauthorizedException, Get, Req, UseGuards, Patch, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        if (!body.username || !body.password) {
            throw new UnauthorizedException('Username and password are required');
        }
        const user = await this.authService.validateUser(body.username, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('change-password')
    async changePassword(@Req() req: any, @Body() body: any) {
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            throw new BadRequestException('currentPassword and newPassword are required');
        }
        try {
            return await this.authService.changePassword(req.user.id, currentPassword, newPassword);
        } catch (error: any) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Error al cambiar contraseña');
        }
    }
}
