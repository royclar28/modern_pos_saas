<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\InvoiceVisionService;
use Exception;

class InventoryController extends Controller
{
    protected $visionService;

    public function __construct(InvoiceVisionService $visionService)
    {
        $this->visionService = $visionService;
    }

    /**
     * Endpoint para recibir una foto de factura, enviarla al LLM,
     * y devolver el borrador de inventario estructurado.
     */
    public function scanInvoice(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // Foto max 5MB
        ]);

        try {
            $data = $this->visionService->extractInvoiceData($request->file('image'));
            
            return response()->json([
                'status' => 'ok',
                'data'   => $data
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
