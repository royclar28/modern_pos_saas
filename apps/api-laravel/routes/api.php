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

Route::post('/forgot-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'forgotPassword'])->name('password.email');
Route::post('/reset-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword'])->name('password.store');

Route::get('/settings/bcv', [SettingsController::class, 'getBcvRate']);

// ── Rutas Protegidas (Requieren Token de Sanctum) ───────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Perfil del usuario autenticado ──────────────────────────
    Route::get('/user', function (Illuminate\Http\Request $request) {
        $u = $request->user();
        return [
            'id'        => $u->id,
            'username'  => $u->username,
            'name'      => $u->full_name,
            'email'     => $u->email,
            'role'      => $u->role,
            'tenant_id' => $u->tenant_id,
        ];
    });

    // ── Rutas abiertas a TODOS los roles autenticados ───────────
    // Sincronización Outbox (Drain Loop) — Ventas (SyncController)
    Route::post('/sync/events', [SyncController::class, 'processBatch']);

    // Hidratación Inicial para Offline mode
    Route::get('/items', [\App\Http\Controllers\Api\SyncReadController::class, 'getItems']);
    Route::get('/customers', [\App\Http\Controllers\Api\SyncReadController::class, 'getCustomers']);
    Route::get('/categories', [\App\Http\Controllers\Api\SyncReadController::class, 'getCategories']);

    // Obtener historial de facturas (todos pueden ver)
    Route::get('/sales', [SaleController::class, 'index']);

    // Obtener Settings (lectura — todos necesitan leerlo para el POS)
    Route::get('/settings', [SettingsController::class, 'getSettings']);

    // ── Rutas para ADMIN y MANAGER ──────────────────────────────
    Route::middleware('role:ADMIN,MANAGER')->group(function () {
        // Inventario
        Route::post('/inventory/scan-invoice', [InventoryController::class, 'scanInvoice']);

        // Sincronizar tasa BCV manualmente
        Route::post('/settings/bcv/sync', [SettingsController::class, 'getBcvRate']);
    });

    // ── Rutas SOLO para ADMIN ───────────────────────────────────
    Route::middleware('role:ADMIN')->group(function () {
        // Configuración de la tienda (escritura)
        Route::patch('/settings', [SettingsController::class, 'getSettings']); // Mock patch

        // SaaS routes (gestión de tiendas)
        Route::get('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'index']);
        Route::post('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'createStore']);
        Route::patch('/saas/stores/{id}/status', [\App\Http\Controllers\Api\SaasController::class, 'toggleStatus']);
    });
});
