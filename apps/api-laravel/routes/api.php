<?php

use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\InventoryController;

// ── Rutas Públicas ──────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

Route::get('/settings/bcv', [SettingsController::class, 'getBcvRate']);

// ── Rutas Protegidas (Requieren Token de Sanctum) ───────────────
Route::middleware('auth:sanctum')->group(function () {
    
    // Obtener Settings
    Route::get('/settings', [\App\Http\Controllers\Api\SettingsController::class, 'getSettings']);
    Route::patch('/settings', [\App\Http\Controllers\Api\SettingsController::class, 'getSettings']); // Mock patch
    
    // SaaS routes
    Route::get('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'index']);
    Route::post('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'createStore']);
    Route::patch('/saas/stores/{id}/status', [\App\Http\Controllers\Api\SaasController::class, 'toggleStatus']); // Mock para forzar el Sync del BCV y devolver ok
    Route::post('/settings/bcv/sync', [SettingsController::class, 'getBcvRate']);

    Route::get('/user', function (Request $request) {
        return collect($request->user())->except(['password', 'remember_token']);
    });

    // Sincronización Outbox (Drain Loop)
    Route::post('/sync/events', [SyncController::class, 'processBatch']);
    
    // Hidratación Inicial para Offline mode
    Route::get('/items', [\App\Http\Controllers\Api\SyncReadController::class, 'getItems']);
    Route::get('/customers', [\App\Http\Controllers\Api\SyncReadController::class, 'getCustomers']);
    Route::get('/categories', [\App\Http\Controllers\Api\SyncReadController::class, 'getCategories']);
    
    // Obtener historial de facturas
    Route::get('/sales', [SaleController::class, 'index']);
    
    // Escaneo de Facturas con IA
    Route::post('/inventory/scan-invoice', [InventoryController::class, 'scanInvoice']);
});
