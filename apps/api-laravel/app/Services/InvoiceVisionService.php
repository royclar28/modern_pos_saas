<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\UploadedFile;
use Exception;

class InvoiceVisionService
{
    /**
     * Extrae los datos de una factura usando LLM Vision (OpenAI GPT-4o).
     */
    public function extractInvoiceData(UploadedFile $invoiceImage): array
    {
        // Obtenemos del .env o de config. Por defecto, usa getenv para asegurar fallback.
        $apiKey = config('services.openai.key') ?? env('OPENAI_API_KEY');
        
        if (!$apiKey) {
            throw new Exception("La clave OPENAI_API_KEY no está configurada en el servidor.");
        }

        $base64Image = base64_encode(file_get_contents($invoiceImage->path()));
        $mimeType = $invoiceImage->getMimeType();
        $payload = "data:{$mimeType};base64,{$base64Image}";

        $prompt = <<<PROMPT
Eres un experto analizando facturas comerciales de proveedores.
Analiza la imagen adjunta y extrae la siguiente información:
1. Nombre del proveedor (supplier_name)
2. Número de factura (invoice_number)
3. Una lista de los artículos comprados (items). Para cada artículo extrae:
   - Descripción o nombre del producto (description)
   - Cantidad exacta (quantity, SOLO número entero o decimal)
   - Costo unitario (unit_cost, SOLO número decimal. Extraer costo antes de impuestos si es claro).

TU RESPUESTA DEBE SER ÚNICAMENTE UN JSON VÁLIDO. Asegúrate de no incluir caracteres Markdown fuera del JSON.
FORMATO ESTRICTO:
{
    "supplier_name": "Nombre CA",
    "invoice_number": "0000123",
    "items": [
        {
            "description": "Articulo de prueba",
            "quantity": 10,
            "unit_cost": 5.50
        }
    ]
}
PROMPT;

        try {
            $response = Http::withToken($apiKey)
                ->timeout(60) // Tiempo holgado por el procesamiento de visión
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o', // Restablecido a OpenAI oficial (Groq descontinuó los modelos Vision)
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'text',
                                    'text' => $prompt
                                ],
                                [
                                    'type' => 'image_url',
                                    'image_url' => [
                                        'url' => "data:{$mimeType};base64,{$base64Image}"
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0.0
                ]);

            if ($response->failed()) {
                throw new Exception("Error conectando con OpenAI: " . $response->body());
            }
        } catch (Exception $e) {
            throw new Exception("Error conectando con OpenAI: " . $e->getMessage());
        }

        $content = $response->json('choices.0.message.content');
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("La respuesta de la IA no pudo parsearse como JSON válido.");
        }

        return $data;
    }
}
