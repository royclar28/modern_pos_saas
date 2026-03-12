import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService, StoreSettings } from './settings.service';

@UseGuards(AuthGuard('jwt'))
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    /**
     * GET /settings
     * Returns all public StoreConfig entries as a flat object.
     * Used by the React SettingsPage and CartProvider (to read taxRate).
     */
    @Get()
    getAll(): Promise<StoreSettings> {
        return this.settingsService.getAll();
    }

    /**
     * PATCH /settings
     * Body: { default_tax_rate?: string, currency_symbol?: string, company?: string, ... }
     * Returns the updated full settings object.
     */
    @Patch()
    update(@Body() body: Partial<StoreSettings>): Promise<StoreSettings> {
        return this.settingsService.updateMany(body);
    }
}
