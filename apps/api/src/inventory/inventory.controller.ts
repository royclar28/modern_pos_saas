import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Logger,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { InvoiceScannerService } from './invoice-scanner.service';

/**
 * Tipos MIME permitidos para las imágenes de facturas.
 */
const ALLOWED_MIME_REGEX = /^image\/(jpeg|jpg|png|webp|gif|bmp|tiff)$/;

/** 20 MB en bytes — límite del modelo Groq */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Controller('inventory')
export class InventoryController {
    private readonly logger = new Logger(InventoryController.name);

    constructor(private readonly scannerService: InvoiceScannerService) {}

    /**
     * POST /api/inventory/scan-invoice
     *
     * Endpoint protegido por JWT. Recibe una imagen de factura y devuelve
     * los productos escaneados por la IA (Groq) en formato JSON.
     *
     * @header Authorization: Bearer <token>
     * @body multipart/form-data → campo "invoice" con la imagen
     *
     * @returns { success: boolean, storeId: string, count: number, products: ScannedProduct[] }
     */
    @Post('scan-invoice')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('invoice'))
    async scanInvoice(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({
                        maxSize: MAX_FILE_SIZE,
                        message: 'La imagen excede el límite de 20MB.',
                    }),
                    new FileTypeValidator({
                        fileType: ALLOWED_MIME_REGEX,
                    }),
                ],
                fileIsRequired: true,
                errorHttpStatusCode: HttpStatus.BAD_REQUEST,
            }),
        )
        file: Express.Multer.File,
        @Req() req: any,
    ) {
        const storeId: string = req.user?.storeId;
        const userId: string = req.user?.id;

        if (!storeId) {
            throw new BadRequestException(
                'No se pudo identificar la tienda del usuario. Inicia sesión de nuevo.',
            );
        }

        this.logger.log(
            `🧾 Usuario ${userId} (tienda ${storeId}) escaneando factura: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
        );

        const mimeType = file.mimetype || 'image/jpeg';
        const products = await this.scannerService.scanInvoice(file.buffer, mimeType);

        return {
            success: true,
            storeId,
            count: products.length,
            products,
        };
    }
}
