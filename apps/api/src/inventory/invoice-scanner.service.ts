import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

/**
 * Estructura que devuelve la IA al escanear cada línea de la factura.
 */
export interface ScannedProduct {
    /** Nombre del producto tal como aparece en la factura */
    name: string;
    /** Cantidad comprada */
    quantity: number;
    /** Costo unitario (precio al que se compró) */
    unitCost: number;
    /** Precio de venta sugerido (estimado por la IA) */
    suggestedPrice: number;
    /** Código de barras si es legible en la factura, null en caso contrario */
    barcode: string | null;
}

@Injectable()
export class InvoiceScannerService {
    private readonly logger = new Logger(InvoiceScannerService.name);
    private readonly groq: Groq;

    constructor(private readonly config: ConfigService) {
        const apiKey = this.config.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            this.logger.warn(
                '⚠️  GROQ_API_KEY no está configurada. El escáner de facturas no funcionará.',
            );
        }
        this.groq = new Groq({ apiKey });
    }

    /**
     * Recibe el buffer de la imagen de la factura, la convierte a Base64,
     * la envía a Groq (modelo con visión) y devuelve el arreglo de productos
     * con structured output estricto.
     */
    async scanInvoice(imageBuffer: Buffer, mimeType: string): Promise<ScannedProduct[]> {
        // ── Validaciones ──────────────────────────────────────────────
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new BadRequestException(
                'No se recibió ninguna imagen. Por favor sube una foto de la factura.',
            );
        }

        const apiKey = this.config.get<string>('GROQ_API_KEY');
        if (!apiKey) {
            throw new InternalServerErrorException(
                'El servicio de escaneo no está disponible. Falta la configuración de GROQ_API_KEY.',
            );
        }

        // ── Convertir la imagen a Base64 data-URI ─────────────────────
        const base64Image = imageBuffer.toString('base64');
        const imageDataUri = `data:${mimeType};base64,${base64Image}`;

        this.logger.log(
            `📸 Procesando factura (${(imageBuffer.length / 1024).toFixed(1)} KB, ${mimeType})`,
        );

        // ── Prompt del sistema ────────────────────────────────────────
        const systemPrompt = `Eres un asistente experto en lectura de facturas de proveedores para bodegas y abastos en Latinoamérica.

INSTRUCCIONES ESTRICTAS:
1. Analiza la imagen de la factura adjunta.
2. Extrae TODOS los productos/ítems que aparezcan como líneas de la factura.
3. Para cada producto identifica: nombre, cantidad, costo unitario.
4. Si el código de barras es visible o está impreso en la factura, inclúyelo. Si no, pon null.
5. Calcula un "suggestedPrice" (precio de venta sugerido) aplicando un margen de ganancia razonable de ~30-40% sobre el unitCost.
6. Responde ÚNICAMENTE con un arreglo JSON válido. SIN texto adicional, SIN Markdown, SIN explicaciones.

FORMATO DE RESPUESTA OBLIGATORIO (JSON puro):
[
  {
    "name": "string",
    "quantity": number,
    "unitCost": number,
    "suggestedPrice": number,
    "barcode": "string | null"
  }
]

Si la imagen NO es una factura o es ilegible, responde exactamente: []`;

        try {
            // ── Llamada a Groq con visión ─────────────────────────────
            const chatCompletion = await this.groq.chat.completions.create({
                model: 'llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analiza esta factura de proveedor y extrae todos los productos. Devuelve SOLO el arreglo JSON.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUri,
                                },
                            },
                        ],
                    },
                ],
                temperature: 0.1, // Baja temperatura para respuestas consistentes
                max_tokens: 4096,
            });

            const rawContent = chatCompletion.choices?.[0]?.message?.content?.trim();

            if (!rawContent) {
                this.logger.warn('Groq devolvió una respuesta vacía');
                throw new BadRequestException(
                    'No se pudo extraer información de la imagen. Intenta con una foto más clara.',
                );
            }

            this.logger.debug(`Respuesta cruda de Groq: ${rawContent.substring(0, 200)}...`);

            // ── Parsear y validar el JSON ─────────────────────────────
            const products = this.parseGroqResponse(rawContent);
            this.logger.log(`✅ Escaneados ${products.length} productos exitosamente`);

            return products;
        } catch (error: unknown) {
            // Si ya es una excepción HTTP de NestJS, re-lanzar tal cual
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }

            const err = error as Record<string, any>;
            this.logger.error(
                `❌ Error al procesar la factura con Groq: ${err.message ?? error}`,
                err.stack,
            );

            // Errores comunes de la API de Groq
            if (err.status === 401) {
                throw new InternalServerErrorException('La API Key de Groq no es válida.');
            }
            if (err.status === 413) {
                throw new BadRequestException(
                    'La imagen es demasiado grande. El límite es 20MB. Intenta con una imagen más pequeña.',
                );
            }
            if (err.status === 429) {
                throw new InternalServerErrorException(
                    'Se excedió el límite de solicitudes de Groq. Intenta de nuevo en unos segundos.',
                );
            }

            throw new InternalServerErrorException(
                'Ocurrió un error al procesar la factura. Por favor intenta de nuevo.',
            );
        }
    }

    /**
     * Limpia y parsea la respuesta de Groq.
     * Maneja casos donde el modelo envuelve la respuesta en bloques de código Markdown.
     */
    private parseGroqResponse(raw: string): ScannedProduct[] {
        let cleaned = raw.trim();

        // Eliminar posibles bloques de código Markdown ```json ... ```
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        // Intentar encontrar el arreglo JSON si hay texto alrededor
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            cleaned = arrayMatch[0];
        }

        let parsed: any[];
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            this.logger.warn(`No se pudo parsear la respuesta de Groq como JSON: ${cleaned.substring(0, 300)}`);
            throw new BadRequestException(
                'La IA no pudo interpretar la factura correctamente. Intenta con una imagen más clara y nítida.',
            );
        }

        if (!Array.isArray(parsed)) {
            throw new BadRequestException(
                'La respuesta de la IA no tiene el formato esperado. Intenta de nuevo.',
            );
        }

        // Validar y normalizar cada producto
        return parsed.map((item: any) => ({
            name: String(item.name || 'Producto desconocido'),
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost) || 0,
            suggestedPrice: Number(item.suggestedPrice) || Number(item.unitCost) * 1.35 || 0,
            barcode: item.barcode ? String(item.barcode) : null,
        }));
    }
}

