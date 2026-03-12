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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ItemsService } from './items.service';
import { Prisma } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('items')
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }

    @Get()
    findAll() {
        return this.itemsService.findAll();
    }

    @Post()
    create(@Body() createItemDto: Prisma.ItemCreateInput) {
        return this.itemsService.create(createItemDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateItemDto: Prisma.ItemUpdateInput,
    ) {
        return this.itemsService.update(id, updateItemDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.itemsService.remove(id);
    }

    /**
     * Delta Sync endpoint for RxDB pull handler.
     * GET /items/sync?since=1700000000000
     */
    @Get('sync')
    sync(@Query('since') since: string) {
        return this.itemsService.getDeltaSince(Number(since ?? 0));
    }
}
