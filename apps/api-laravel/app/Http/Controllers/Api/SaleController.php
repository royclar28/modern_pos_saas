<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Sale;

class SaleController extends Controller
{
    /**
     * Get the latest sales for the current tenant.
     * The TenantScope automatically filters these by the authenticated user's tenant_id.
     */
    public function index(Request $request)
    {
        $sales = Sale::with(['items.item', 'customer'])
                     ->latest()
                     ->limit(50)
                     ->get();

        return response()->json([
            'status' => 'ok',
            'data'   => $sales,
        ]);
    }
}
