<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Get modern POS SaaS general settings.
     * Currently mocked to satisfy frontend SettingsProvider.
     */
    public function getSettings(Request $request)
    {
        $bcvRateData = $this->scrapeBcvRate();
        
        return response()->json([
            'default_tax_rate' => '16',
            'currency_symbol' => '$',
            'exchange_rate' => $bcvRateData['rate'] ?? 36.5,
            'company' => 'Mi Negocio',
            'timezone' => 'America/Caracas',
            'language' => 'es',
            'enable_credit_sales' => 'true',
            'primaryColor' => '#7C3AED',
        ]);
    }
    /**
     * Get the official exchange rate (e.g. BCV for Venezuela).
     * This endpoint is public or protected depending on business rules.
     */
    public function getBcvRate(Request $request)
    {
        $rateData = $this->scrapeBcvRate();

        if (isset($rateData['error'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener tasa BCV: ' . $rateData['error'],
                // Fallback safe return
                'rate' => 36.5,
                'source' => 'Fallback Local'
            ], 500);
        }

        return response()->json([
            'status'     => 'ok',
            'rate'       => $rateData['rate'],
            'updated_at' => $rateData['updated_at'],
            'source'     => $rateData['source']
        ]);
    }

    private function scrapeBcvRate()
    {
        $cacheKey = 'bcv_usd_rate';

        $rateData = cache()->remember($cacheKey, now()->addHours(2), function () {
            try {
                // Hacer la petición desactivando verificación SSL por fallos del BCV
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()
                    ->timeout(10)
                    ->get('https://www.bcv.org.ve/');

                if ($response->failed()) {
                    throw new \Exception('No se pudo conectar a la página del BCV.');
                }

                $html = $response->body();

                // Usar DOMDocument para hacer scraping del div#dolar
                $dom = new \DOMDocument();
                @$dom->loadHTML($html);
                $xpath = new \DOMXPath($dom);
                
                // Usualmente el bloque del dólar está dentro de <div id="dolar"> -> <div class="centrado"> -> <strong>
                $nodes = $xpath->query('//div[@id="dolar"]//strong');

                if ($nodes->length > 0) {
                    $rateText = trim($nodes->item(0)->nodeValue);
                    // Formato BCV es ej. "36,25430000" -> Cambiar coma por punto
                    $rateClean = str_replace(',', '.', $rateText);
                    $rateFloat = (float) $rateClean;

                    if ($rateFloat > 0) {
                        return [
                            'rate' => $rateFloat,
                            'updated_at' => now()->toIso8601String(),
                            'source' => 'BCV (Oficial)'
                        ];
                    }
                }

                // Fallback por si la estructura DOM cambia, intentamos regex sobre dolar
                if (preg_match('/<div id="dolar".*?<strong>\s*([0-9]+,[0-9]+)\s*<\/strong>/is', $html, $matches)) {
                    $rateFloat = (float) str_replace(',', '.', $matches[1]);
                    return [
                        'rate' => $rateFloat,
                        'updated_at' => now()->toIso8601String(),
                        'source' => 'BCV (Regex Oficial)'
                    ];
                }

                throw new \Exception('No se encontró la tasa en el HTML del BCV.');

            } catch (\Exception $e) {
                // En caso de fallo absoluto y no haber caché, devolver error
                return [
                    'error' => $e->getMessage()
                ];
            }
        });

        if (isset($rateData['error'])) {
            cache()->forget($cacheKey);
        }

        return $rateData;
    }
}
