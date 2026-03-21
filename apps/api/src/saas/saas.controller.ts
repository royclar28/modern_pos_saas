import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { SaasService } from './saas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('saas/stores')
export class SaasController {
    constructor(private readonly saasService: SaasService) {}

    @Get()
    @Roles('SUPER_ADMIN')
    getStores(@Query('skip') skip?: string, @Query('take') take?: string) {
        return this.saasService.getStores(skip ? parseInt(skip) : 0, take ? parseInt(take) : 10);
    }

    @Post()
    @Roles('SUPER_ADMIN')
    createStore(@Body() body: { name: string, rif: string, ownerEmail: string }) {
        return this.saasService.createStore(body.name, body.rif, body.ownerEmail);
    }

    @Patch(':id/status')
    @Roles('SUPER_ADMIN')
    toggleStoreStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.saasService.toggleStoreStatus(id, body.isActive);
    }
}
