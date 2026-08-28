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
        // Obtenemos del .env o de config.
        $apiKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');
        
        if (!$apiKey) {
            throw new Exception("La clave GEMINI_API_KEY no está configurada en el servidor.");
        }

        $mimeType = $invoiceImage->getMimeType();
        $base64String = base64_encode(file_get_contents($invoiceImage->path()));

        $systemPrompt = <<<PROMPT
Eres un asistente experto en lectura de facturas de proveedores para bodegas y abastos en Latinoamérica.

INSTRUCCIONES ESTRICTAS:
1. Analiza la imagen de la factura adjunta.
2. Extrae TODOS los productos/ítems que aparezcan como líneas de la factura.
3. Para cada producto identifica: nombre, cantidad, costo unitario.
4. Calcula un "suggestedPrice" (precio de venta sugerido) aplicando un margen de ganancia razonable de ~30-40% sobre el costo.
5. Responde ÚNICAMENTE con un arreglo JSON válido.

FORMATO DE RESPUESTA OBLIGATORIO:
[
  {
    "name": "string (nombre del producto)",
    "quantity": 10,
    "unitCost": 5.50
  }
]

Si la imagen NO es una factura o es ilegible, responde exactamente: []
PROMPT;

        try {
            $response = Http::timeout(60)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}", [
                    'system_instruction' => [
                        'parts' => [
                            ['text' => $systemPrompt]
                        ]
                    ],
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => 'Analiza esta factura de proveedor y extrae todos los productos. Devuelve SOLO el arreglo JSON puro como indicaste en las instrucciones.'],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data' => $base64String
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'responseMimeType' => 'application/json'
                    ]
                ]);

            if ($response->failed()) {
                throw new Exception("Error HTTP Gemini: " . $response->body());
            }
        } catch (Exception $e) {
            throw new Exception($e->getMessage());
        }

        $content = $response->json('candidates.0.content.parts.0.text') ?? '';
        
        $parsed = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("La respuesta de la IA no pudo parsearse como JSON válido. Raw: " . substr($content, 0, 100));
        }

        // Si es un array directo (como pide Node), lo empaquetamos
        $items = [];
        if (is_array($parsed) && isset($parsed['items'])) {
            $items = $parsed['items'];
        } elseif (is_array($parsed)) {
            $items = $parsed; // ya es el arreglo de productos
        }

        // Normalizar las keys de salida
        $normalizedItems = [];
        foreach ($items as $item) {
            $desc = $item['description'] ?? $item['name'] ?? $item['nombre'] ?? $item['producto'] ?? 'Producto detectado sin nombre';
            $qty = $item['quantity'] ?? $item['cantidad'] ?? 1;
            $cost = $item['unitCost'] ?? $item['unit_cost'] ?? $item['costo'] ?? $item['precio'] ?? 0;

            $normalizedItems[] = [
                'description' => $desc,
                'quantity'    => $qty,
                'unit_cost'   => $cost
            ];
        }

        return ['items' => $normalizedItems];
    }
}
