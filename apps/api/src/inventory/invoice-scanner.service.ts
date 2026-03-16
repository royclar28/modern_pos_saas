import { Injectable, Logger } from '@nestjs/common';

/**
 * InvoiceScannerService
 *
 * Mock service that simulates AI-based invoice scanning.
 * In production this would call an OCR / Vision API (Google Vision, Azure AI, etc.)
 * and parse the structured product lines from the invoice image.
 *
 * For now it returns a hardcoded set of 3 products to allow
 * the frontend team to build the review UX.
 */
export interface ScannedProduct {
    name: string;
    sku: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    category: string;
}

@Injectable()
export class InvoiceScannerService {
    private readonly logger = new Logger(InvoiceScannerService.name);

    async scanInvoice(_imageBuffer: Buffer): Promise<ScannedProduct[]> {
        this.logger.log('Mock invoice scan triggered — returning simulated data');

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return [
            {
                name: 'Harina Pan 1kg',
                sku: '75912345',
                costPrice: 0.90,
                unitPrice: 1.50,
                quantity: 20,
                category: 'Alimentos',
            },
            {
                name: 'Aceite Mazeite 900ml',
                sku: '75967890',
                costPrice: 2.10,
                unitPrice: 3.25,
                quantity: 12,
                category: 'Alimentos',
            },
            {
                name: 'Jabón Las Llaves 200g',
                sku: '75954321',
                costPrice: 0.45,
                unitPrice: 0.85,
                quantity: 50,
                category: 'Limpieza',
            },
        ];
    }
}
