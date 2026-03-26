import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryController } from './inventory.controller';
import { InvoiceScannerService } from './invoice-scanner.service';

@Module({
    imports: [ConfigModule],
    controllers: [InventoryController],
    providers: [InvoiceScannerService],
})
export class InventoryModule {}
