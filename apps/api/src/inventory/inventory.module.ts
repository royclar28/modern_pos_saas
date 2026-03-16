import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InvoiceScannerService } from './invoice-scanner.service';

@Module({
    controllers: [InventoryController],
    providers: [InvoiceScannerService],
})
export class InventoryModule {}
