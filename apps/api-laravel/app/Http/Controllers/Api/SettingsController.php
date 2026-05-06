<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    /**
     * Default values for every setting key.
     * Used when a tenant hasn't set a particular key yet.
     */
    private const DEFAULTS = [
        'default_tax_rate'    => '16',
        'currency_symbol'     => '$',
        'company'             => 'Mi Negocio',
        'timezone'            => 'America/Caracas',
        'language'            => 'es',
        'enable_credit_sales' => 'false',
        'primaryColor'        => '#7C3AED',
    ];

    /**
     * GET /api/settings
     * Returns the current tenant's settings merged with defaults,
     * plus the live BCV exchange rate.
     */
    public function getSettings(Request $request)
    {
        // Load all config rows for this tenant (HasTenant scope applies automatically)
        $dbRows = StoreConfig::all()->pluck('value', 'key')->toArray();

        // Merge: defaults → DB values (DB wins)
        $settings = array_merge(self::DEFAULTS, $dbRows);

        // Pull store name from the stores table as authoritative source for 'company'
        $store = Store::find(Auth::user()->tenant_id);
        if ($store && !isset($dbRows['company'])) {
            $settings['company'] = $store->name;
        }

        // Append live BCV exchange rate
        $bcvRateData = $this->scrapeBcvRate();
        $settings['exchange_rate'] = (string) ($bcvRateData['rate'] ?? 36.5);

        return response()->json($settings);
    }

    /**
     * PATCH /api/settings
     * Persists a partial or full settings payload to the store_configs table.
     * Only whitelisted keys are accepted.
     */
    public function updateSettings(Request $request)
    {
        $allowed = array_keys(self::DEFAULTS);

        $request->validate([
            'default_tax_rate'    => 'sometimes|numeric|min:0|max:100',
            'currency_symbol'     => 'sometimes|string|max:5',
            'company'             => 'sometimes|string|max:255',
            'timezone'            => 'sometimes|string|max:100',
            'language'            => 'sometimes|string|max:10',
            'enable_credit_sales' => 'sometimes|in:true,false',
            'primaryColor'        => ['sometimes', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $tenantId = Auth::user()->tenant_id;

        foreach ($allowed as $key) {
            if ($request->has($key)) {
                StoreConfig::withoutGlobalScopes()->updateOrCreate(
                    ['tenant_id' => $tenantId, 'key' => $key],
                    ['value' => (string) $request->input($key)]
                );
            }
        }

        // If company name changed, also update the canonical Store name
        if ($request->has('company')) {
            Store::where('id', $tenantId)->update(['name' => $request->input('company')]);
        }

        return response()->json(['status' => 'ok', 'message' => 'Configuración guardada correctamente.']);
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
