<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Item;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    /**
     * Devuelve el catálogo público de una tienda (productos y datos de la tienda)
     */
    public function show(string $tenantId): JsonResponse
    {
        $store = Store::find($tenantId);

        if (!$store) {
            return response()->json(['message' => 'Tienda no encontrada.'], 404);
        }

        if (!$store->catalog_enabled) {
            return response()->json(['message' => 'El catálogo no está disponible para esta tienda.'], 403);
        }

        // Obtener productos activos de la tienda, con categoría y marca si aplican.
        // Asumiendo que el stock > 0 o que simplemente los mostramos todos
        // (ya que se pidió que solo se muestre el producto sin detallar el stock).
        // Se omiten datos sensibles (cost_price).
        $items = Item::where('tenant_id', $tenantId)
            ->with(['category:id,name', 'brand:id,name'])
            ->select([
                'id',
                'name',
                'description',
                'unit_price',
                'category_id',
                'brand_id',
                'sell_by',
                'unit_label'
            ])
            ->get();

        return response()->json([
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'whatsapp_number' => $store->whatsapp_number,
                'logo_url' => $store->logo_url,
                'primary_color' => $store->primary_color,
            ],
            'items' => $items,
        ]);
    }
}
