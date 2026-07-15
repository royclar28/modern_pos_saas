<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SyncReadController extends Controller
{
    /**
     * Devuelve el catálogo de productos (items) del tenant actual
     * para la hidratación inicial del POS offline.
     *
     * Query params:
     *   ?page=1        — página (default: 1, 0 = todos sin paginar)
     *   ?per_page=200  — items por página (default: 200, max: 1000)
     */
    public function getItems(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 200), 1000);
        $page    = (int) $request->query('page', 1);

        $query = Item::select([
            'id', 'tenant_id', 'name', 'category', 'item_number',
            'description', 'cost_price', 'unit_price',
            'stock', 'reorder_level', 'min_stock_alert',
            'receiving_quantity', 'allow_alt_description',
            'is_serialized', 'sell_by', 'unit_label', 'created_at', 'updated_at',
        ]);

        // Si page=0, devolver todo sin paginar (compatibilidad hacia atrás)
        if ($page === 0) {
            $items = $query->get();
            return response()->json($items);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
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
