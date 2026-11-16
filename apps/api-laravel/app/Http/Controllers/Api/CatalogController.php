<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Item;
use App\Models\StoreConfig;
use App\Services\BcvService;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function __construct(
        private readonly BcvService $bcv,
    ) {}

    /**
     * Devuelve el catálogo público de una tienda (productos y datos de la tienda)
     */
    public function show(string $tenantId): JsonResponse
    {
        $store = Store::where('id', $tenantId)
            ->orWhereRaw('LOWER(name) = ?', [strtolower(str_replace('-', ' ', $tenantId))])
            ->orWhereRaw("LOWER(REPLACE(name, ' ', '-')) = ?", [strtolower($tenantId)])
            ->first();

        if (!$store) {
            return response()->json(['message' => 'Tienda no encontrada.'], 404);
        }

        if (!$store->catalog_enabled) {
            return response()->json(['message' => 'El catálogo no está disponible para esta tienda.'], 403);
        }

        // Obtener productos de la tienda con categoría y marca
        $items = Item::where('tenant_id', $store->id)
            ->with(['category:id,name', 'brand:id,name'])
            ->select([
                'id',
                'name',
                'description',
                'unit_price',
                'stock',
                'category_id',
                'brand_id',
                'sell_by',
                'unit_label'
            ])
            ->orderBy('name')
            ->get();

        // Obtener tasa BCV y moneda configurada
        $bcvRateData = $this->bcv->getRate();
        $rate = (float) ($bcvRateData['rate'] ?? 36.5);

        $currencySymbol = StoreConfig::withoutGlobalScopes()
            ->where('tenant_id', $store->id)
            ->where('key', 'currency_symbol')
            ->value('value') ?? '$';

        return response()->json([
            'store' => [
                'id'              => $store->id,
                'name'            => $store->name,
                'whatsapp_number' => $store->whatsapp_number,
                'rif'             => $store->rif,
                'logo_url'        => $store->logo_url,
                'primary_color'   => $store->primary_color,
                'currency_symbol' => $currencySymbol,
            ],
            'exchange_rate' => $rate,
            'items'         => $items,
        ]);
    }
}
