import { Controller, Get, Patch, Body, UseGuards, Post, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService, StoreSettings } from './settings.service';
import { BcvService } from './bcv.service';

@UseGuards(AuthGuard('jwt'))
@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly bcvService: BcvService
    ) {}

    @Post('bcv/sync')
    async forceSyncBcv(@Req() req: any) {
        await this.bcvService.updateBcvRate(req.user.storeId);
        return this.settingsService.getAll(req.user.storeId);
    }

    /**
     * GET /settings
     * Returns all public StoreConfig entries as a flat object.
     * Used by the React SettingsPage and CartProvider (to read taxRate).
     */
    @Get()
    getAll(@Req() req: any): Promise<StoreSettings> {
        return this.settingsService.getAll(req.user.storeId);
    }

    /**
     * PATCH /settings
     * Body: { default_tax_rate?: string, currency_symbol?: string, company?: string, ... }
     * Returns the updated full settings object.
     */
    @Patch()
    update(@Req() req: any, @Body() body: Partial<StoreSettings>): Promise<StoreSettings> {
        return this.settingsService.updateMany(req.user.storeId, body);
    }
}
