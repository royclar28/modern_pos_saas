<?php

use App\Http\Controllers\Api\CashShiftController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TenantRegistrationController;
use App\Http\Controllers\Api\SaasMetricsController;

// ── Rutas Públicas ──────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Registro de nuevos tenants (prueba gratuita de 30 días)
Route::post('/register', [TenantRegistrationController::class, 'register'])->middleware('throttle:3,1');

Route::post('/forgot-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'forgotPassword'])
    ->middleware('throttle:5,1')
    ->name('password.email');
Route::post('/reset-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword'])->name('password.store');

Route::get('/settings/bcv', [SettingsController::class, 'getBcvRate']);

// ── Rutas Protegidas (Requieren Token de Sanctum) ─────────────────
// El middleware 'trial' bloquea el acceso si el trial expiró (HTTP 402)
Route::middleware(['auth:sanctum', 'trial'])->group(function () {

    Route::patch('/auth/change-password', [AuthController::class, 'changePassword']);

    // ── Perfil del usuario autenticado ──────────────────────────
    Route::get('/user', function (Illuminate\Http\Request $request) {
        $u     = $request->user();
        $store = $u->store;
        return [
            'id'             => $u->id,
            'username'       => $u->username,
            'name'           => $u->full_name,
            'email'          => $u->email,
            'role'           => $u->role,
            'tenant_id'      => $u->tenant_id,
            // Trial info (null cuando el plan es pagado/sin trial)
            'trial_ends_at'  => $store?->trial_ends_at?->toISOString(),
            'store_status'   => $store?->status,
        ];
    });

    // ── Rutas abiertas a TODOS los roles autenticados ───────────
    // Sincronización Outbox (Drain Loop) — Ventas (SyncController)
    Route::post('/sync/events', [SyncController::class, 'processBatch']);

    // Hidratación Inicial para Offline mode
    Route::get('/items', [\App\Http\Controllers\Api\SyncReadController::class, 'getItems']);
    Route::get('/customers', [\App\Http\Controllers\Api\SyncReadController::class, 'getCustomers']);
    Route::get('/categories', [\App\Http\Controllers\Api\SyncReadController::class, 'getCategories']);
    Route::get('/categories/table', [\App\Http\Controllers\Api\SyncReadController::class, 'getCategoriesTable']);

    // Obtener historial de facturas (todos pueden ver)
    Route::get('/sales', [SaleController::class, 'index']);

    // Obtener Settings (lectura — todos necesitan leerlo para el POS)
    Route::get('/settings', [SettingsController::class, 'getSettings']);

    // Dashboard — resumen financiero del día
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // ── Rutas para ADMIN y MANAGER ──────────────────────────────
    Route::middleware('role:ADMIN,MANAGER')->group(function () {
        // Inventario
        Route::post('/inventory/scan-invoice', [InventoryController::class, 'scanInvoice']);

        // Sincronizar tasa BCV manualmente
        Route::post('/settings/bcv/sync', [SettingsController::class, 'getBcvRate']);

        // ── Historial de Cierres de Caja ──────────────────────
        Route::get('/cash-shifts', [CashShiftController::class, 'index']);
    });

    // ── Rutas SOLO para ADMIN ───────────────────────────────────
    Route::middleware('role:ADMIN')->group(function () {
        // Configuración de la tienda (escritura)
        Route::patch('/settings', [SettingsController::class, 'updateSettings']);

        // SaaS routes (gestión de tiendas)
        Route::get('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'index']);
        Route::post('/saas/stores', [\App\Http\Controllers\Api\SaasController::class, 'createStore']);
        Route::patch('/saas/stores/{id}/status', [\App\Http\Controllers\Api\SaasController::class, 'toggleStatus']);
    });

    // ── Rutas EXCLUSIVAS para SUPER_ADMIN (Master Dashboard) ──────
    // role:SUPER_ADMIN es el único nivel que NO hace bypass; requiere
    // explícitamente el rol. Ningún ADMIN de tienda puede acceder.
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('/saas/metrics', [SaasMetricsController::class, 'metrics']);
    });
});

// ── Rutas Módulo Quiniela (Marketing Bounded Context) ───────────────
Route::prefix('worldcup')->group(function () {
    Route::post('/register', [\App\Http\Controllers\Api\QuinielaController::class, 'register']);
    Route::get('/matches', [\App\Http\Controllers\Api\QuinielaController::class, 'getMatches']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/predictions', [\App\Http\Controllers\Api\QuinielaController::class, 'submitPredictions']);
    });
});

