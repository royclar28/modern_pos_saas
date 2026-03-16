import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ItemsService } from './items.service';
import { Prisma } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('items')
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }

    @Get()
    findAll(@Req() req: any) {
        return this.itemsService.findAll(req.user.storeId);
    }

    @Post()
    create(@Req() req: any, @Body() createItemDto: Omit<Prisma.ItemCreateInput, 'store'>) {
        return this.itemsService.create(req.user.storeId, createItemDto as any);
    }

    @Patch(':id')
    update(
        @Req() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateItemDto: Prisma.ItemUpdateInput,
    ) {
        return this.itemsService.update(req.user.storeId, id, updateItemDto);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.itemsService.remove(req.user.storeId, id);
    }

    /**
     * Delta Sync endpoint for RxDB pull handler.
     * GET /items/sync?since=1700000000000
     */
    @Get('sync')
    sync(@Req() req: any, @Query('since') since: string) {
        return this.itemsService.getDeltaSince(req.user.storeId, Number(since ?? 0));
    }
}
