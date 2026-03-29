<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;

class SaasController extends Controller
{
    public function index(Request $request)
    {
        $stores = Store::orderBy('created_at', 'desc')->get()->map(function($store) {
            return [
                'id' => $store->id,
                'name' => $store->name,
                'rif' => 'J-12345678-9',
                'ownerEmail' => 'owner@example.com',
                'plan' => 'ENTERPRISE',
                'isActive' => true,
                'createdAt' => $store->created_at->toISOString()
            ];
        });

        return response()->json([
            'items' => $stores,
            'total' => $stores->count()
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        return response()->json(['message' => 'Toggled successfully', 'isActive' => $request->isActive]);
    }

    public function createStore(Request $request)
    {
        return response()->json([
            'message' => 'Store created in demo mode',
            'temporaryPassword' => 'demopass123'
        ]);
    }
}
