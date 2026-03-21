import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

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

    async scanInvoice(imageBuffer: Buffer): Promise<ScannedProduct[]> {
        this.logger.log('Real AI invoice scan triggered via HTTP fetch');

        // Determinamos qué API key está disponible. Por defecto OpenAI (gpt-4o), pero puedes cambiar la URL a tu proveedor real.
        const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY; 
        
        if (!apiKey) {
             throw new HttpException(
                 'No se encontró una API Key (OPENAI_API_KEY) en las variables de entorno.',
                 HttpStatus.INTERNAL_SERVER_ERROR
             );
        }

        const base64Image = imageBuffer.toString('base64');
        
        const payload = {
            model: "meta-llama/llama-4-scout-17b-16e-instruct", // Modelo exacto solicitado por el usuario
            messages: [
                {
                    role: "system",
                    content: "Eres un OCR experto en facturas. Tu único objetivo es extraer los productos de las imágenes de facturas que recibas y devolver exclusivamente un objeto JSON puro (sin formato markdown ni bloques de código) con la propiedad 'products' que contenga un array de objetos con las siguientes claves estrictas: name (string), sku (string, si no tiene invéntale o pon ''), costPrice (number), unitPrice (number, usualmente 30% mas del costo si no aparece listado la venta), quantity (number) y category (string). INSTRUCCIÓN CRÍTICA PARA 'name': Limpia y pule el título comercial; omite o remueve palabras genéricas y redundantes como 'PRODUCTO', 'ARTICULO', 'PREPARADO', etc. Por ejemplo, en vez de 'PRODUCTO LACTEO NUTRILECHE 1/1 LT', devuelve 'Lácteo Nutrileche 1 Lt'. Usa formato Title Case."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extrae los productos de esta factura." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 1500,
            temperature: 0.1,
        };

        try {
            const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.text();
                this.logger.error(`AI API Error: ${errData}`);
                throw new HttpException('Fallo al comunicarse con la API de IA', HttpStatus.BAD_GATEWAY);
            }

            const data = await response.json();
            const aiMessage = data.choices[0].message.content;
            
            // Limpiamos la respuesta en caso de que la IA responda con bloques de código markdown ```json ... ```
            const cleanMessage = aiMessage.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanMessage);

            if (parsed && Array.isArray(parsed.products)) {
                return parsed.products;
            } else {
                return [];
            }
        } catch (error) {
            this.logger.error('Error procesando imagen con IA:', error);
            throw new HttpException('La IA no pudo procesar la factura correctamente', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
