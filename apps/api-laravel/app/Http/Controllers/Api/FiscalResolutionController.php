<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FiscalDocumentType;
use App\Models\FiscalResolution;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class FiscalResolutionController extends Controller
{
    public function getDocumentTypes()
    {
        return response()->json(FiscalDocumentType::where('is_active', true)->get());
    }

    public function index()
    {
        $resolutions = FiscalResolution::with('documentType')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($resolutions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'document_type_id' => 'required|uuid|exists:fiscal_document_types,id',
            'prefix' => 'nullable|string|max:10',
            'from_number' => 'required|integer|min:1',
            'to_number' => 'required|integer|gte:from_number',
            'resolution_number' => 'nullable|string|max:255',
            'resolution_date' => 'nullable|date',
        ]);

        $tenantId = auth()->user()->tenant_id;

        DB::transaction(function () use ($validated, $tenantId) {
            // Desactivar resoluciones anteriores del mismo tipo para este tenant
            FiscalResolution::where('tenant_id', $tenantId)
                ->where('document_type_id', $validated['document_type_id'])
                ->update(['is_active' => false]);

            FiscalResolution::create([
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'document_type_id' => $validated['document_type_id'],
                'prefix' => $validated['prefix'] ?? '',
                'from_number' => $validated['from_number'],
                'to_number' => $validated['to_number'],
                'current_number' => $validated['from_number'],
                'resolution_number' => $validated['resolution_number'],
                'resolution_date' => $validated['resolution_date'],
                'is_active' => true,
            ]);
        });

        return response()->json(['message' => 'Resolución fiscal registrada y activada correctamente.'], 201);
    }
}
