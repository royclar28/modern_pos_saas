<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SyncReadController extends Controller
{
    /**
     * Devuelve todo el catálogo de productos (items) del tenant actual
     * para la hidratación inicial del POS offline.
     */
    public function getItems(Request $request): JsonResponse
    {
        // El TenantScope asegura que solo se traigan los ítems del usuario
        // Traemos todos los items (podría paginarse en un futuro, pero para POS
        // offline es común traer todo o en chunks).
        $items = Item::select([
            'id', 'name', 'category', 'item_number',
            'description', 'cost_price', 'unit_price',
            'stock', 'reorder_level', 'min_stock_alert',
            'receiving_quantity', 'allow_alt_description',
            'is_serialized', 'sell_by', 'unit_label', 'updated_at', // ← agregado sell_by, unit_label
        ])->get();
        
        return response()->json($items);
    }

    /**
     * Devuelve el directorio de clientes del tenant actual.
     */
    public function getCustomers(Request $request): JsonResponse
    {
        $customers = \App\Models\Customer::all();
        
        return response()->json($customers);
    }

    /**
     * Devuelve las categorías de productos usadas en el catálogo.
     */
    public function getCategories(Request $request): JsonResponse
    {
        // Puesto que "category" es un string en la tabla Items,
        // agrupamos los valores distintos para rehidratar el selector.
        $categories = Item::distinct()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->pluck('category');
            
        return response()->json($categories);
    }

    /**
     * Devuelve las categorías del tenant actual (tabla categories).
     */
    public function getCategoriesTable(Request $request): JsonResponse
    {
        $categories = \App\Models\Category::select(['id', 'name', 'sort_order'])
            ->orderBy('sort_order')
            ->get();

        return response()->json($categories);
    }
}
