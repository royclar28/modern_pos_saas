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

        $systemPrompt = <<<PROMPT
Eres un asistente experto en lectura de facturas de proveedores para bodegas y abastos en Latinoamérica.

INSTRUCCIONES ESTRICTAS:
1. Analiza la imagen de la factura adjunta.
2. Extrae TODOS los productos/ítems que aparezcan como líneas de la factura.
3. Para cada producto identifica: nombre, cantidad, costo unitario.
4. Si el código de barras es visible o está impreso en la factura, inclúyelo. Si no, pon null.
5. Calcula un "suggestedPrice" (precio de venta sugerido) aplicando un margen de ganancia razonable de ~30-40% sobre el costo.
6. Responde ÚNICAMENTE con un arreglo JSON válido. SIN texto adicional, SIN Markdown, SIN explicaciones.

FORMATO DE RESPUESTA OBLIGATORIO (JSON puro):
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
            $response = Http::withToken($apiKey)
                ->timeout(60) 
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => 'meta-llama/llama-4-scout-17b-16e-instruct',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $systemPrompt
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'text',
                                    'text' => 'Analiza esta factura de proveedor y extrae todos los productos. Devuelve SOLO el arreglo JSON puro.'
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
                    'temperature' => 0.1,
                    'max_tokens' => 4096
                ]);

            if ($response->failed()) {
                throw new Exception("Error HTTP Groq: " . $response->body());
            }
        } catch (Exception $e) {
            throw new Exception("Excepción al conectar con Groq: " . $e->getMessage());
        }

        $content = $response->json('choices.0.message.content') ?? '';
        
        // 1. Regex Robusto para extraer mágicamente el JSON Array, ignorando la charlatanería de Llama-4
        if (preg_match('/\[[\s\S]*\]/', $content, $matches)) {
            $jsonString = $matches[0];
        } else {
            // Plan B: Buscar un objeto en caso de que Llama se ponga terco
            if (preg_match('/\{[\s\S]*\}/', $content, $matches)) {
                $jsonString = $matches[0];
            } else {
                $jsonString = $content;
            }
        }

        $parsed = json_decode($jsonString, true);

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

        // 2. Normalizar las keys de salida porque Llama puede devolver "nombre", "name", "description"...
        $normalizedItems = [];
        foreach ($items as $item) {
            // Mapeo defensivo de cualquier variante que se le ocurra a Llama
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
