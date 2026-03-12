import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ItemDTO, SyncPayload } from '@pos/shared';

@Controller('sync')
export class SyncController {

    @Get('pull')
    async pullChanges(@Query('lastPulledAt') lastPulledAt: string): Promise<SyncPayload<ItemDTO>> {
        // TODO: Obtener datos de Prisma donde updatedAt > lastPulledAt
        return {
            lastPulledAt: Date.now(),
            documents: []
        };
    }

    @Post('push')
    async pushChanges(@Body() body: { rows: ItemDTO[] }) {
        // TODO: Actualizar DB de Prisma gestionando conflictos (CRDTs o LWW)
        return { success: true };
    }
}
