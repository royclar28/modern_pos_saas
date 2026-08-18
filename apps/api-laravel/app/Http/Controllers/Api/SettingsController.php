<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreConfig;
use App\Services\BcvService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    public function __construct(
        private readonly BcvService $bcv,
    ) {}

    /**
     * Default values for every setting key.
     */
    private const DEFAULTS = [
        'default_tax_rate'    => '0',
        'currency_symbol'     => '$',
        'company'             => 'Mi Negocio',
        'timezone'            => 'America/Caracas',
        'language'            => 'es',
        'enable_credit_sales' => 'false',
        'primaryColor'        => '#7C3AED',
        'rif'                 => '',
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
        if ($store) {
            if (!isset($dbRows['company'])) {
                $settings['company'] = $store->name;
            }
            $settings['logo_url'] = $store->logo_url;
        }

        // Append live BCV exchange rate
        $bcvRateData = $this->bcv->getRate();
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
            'rif'                 => 'sometimes|string|max:50',
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
        // Si es POST (sync forzado), refrescar ignorando caché
        $rateData = $request->isMethod('POST')
            ? $this->bcv->refresh()
            : $this->bcv->getRate();

        if (isset($rateData['error'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener tasa BCV: ' . $rateData['error'],
                'rate' => $this->bcv->fallbackRate(),
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
}
