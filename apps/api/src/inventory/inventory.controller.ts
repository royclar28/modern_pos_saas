import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoiceScannerService } from './invoice-scanner.service';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly scannerService: InvoiceScannerService) {}

    /**
     * POST /inventory/scan-invoice
     *
     * Receives an invoice image (multipart/form-data, field name: "invoice")
     * and returns an array of scanned products for frontend review.
     *
     * Currently uses a mock service. In production, swap InvoiceScannerService
     * with a real OCR/Vision integration.
     */
    @Post('scan-invoice')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('invoice'))
    async scanInvoice(@UploadedFile() file?: any) {
        // Even without a real file, the mock service returns simulated data
        const buffer = file?.buffer ?? Buffer.alloc(0);
        const products = await this.scannerService.scanInvoice(buffer);

        return {
            success: true,
            count: products.length,
            products,
        };
    }
}
