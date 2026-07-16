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
    return response()->json(['message' => 'Please login via POST'], 401);
})->name('login');

Route::get('/migrate-debug', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return response(\Illuminate\Support\Facades\Artisan::output(), 200)
            ->header('Content-Type', 'text/plain');
    } catch (\Throwable $e) {
        $error = \Illuminate\Support\Facades\Artisan::output() . "\nERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
        return response($error, 500)
            ->header('Content-Type', 'text/plain');
    }
});

// Registro de nuevos tenants (prueba gratuita de 30 días)
Route::post('/register', [TenantRegistrationController::class, 'register'])->middleware('throttle:3,1');

Route::post('/forgot-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'forgotPassword'])
    ->middleware('throttle:5,1')
    ->name('password.email');
Route::post('/reset-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword'])->name('password.store');

Route::get('/settings/bcv', [SettingsController::class, 'getBcvRate']);

// ── Health Check ──────────────────────────────────────────────
Route::get('/health', function () {
    $checks = [
        'version'  => config('app.version', '1.0.0'),
        'time'     => now()->toIso8601String(),
        'database' => 'fail',
        'cache'    => 'fail',
    ];

    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $checks['database'] = 'ok';
    } catch (\Throwable) {}

    try {
        \Illuminate\Support\Facades\Cache::set('health_check', 'ok', 10);
        $checks['cache'] = \Illuminate\Support\Facades\Cache::get('health_check') === 'ok' ? 'ok' : 'fail';
    } catch (\Throwable) {}

    $allOk = !in_array('fail', $checks);
    return response()->json(['status' => $allOk ? 'healthy' : 'degraded', ...$checks], $allOk ? 200 : 503);
});

// ── Rutas Protegidas (Requieren Token de Sanctum) ─────────────────
// El middleware 'trial' bloquea el acceso si el trial expiró (HTTP 402)
Route::middleware(['auth:sanctum', 'trial', 'touch.session'])->group(function () {

    Route::patch('/auth/change-password', [AuthController::class, 'changePassword']);

    // ── Perfil del usuario autenticado ──────────────────────────
    Route::get('/user', function (Illuminate\Http\Request $request) {
        $u     = $request->user();
        $store = $u->store;
        $planSvc = app(\App\Services\PlanService::class);

        return [
            'id'             => $u->id,
            'username'       => $u->username,
            'name'           => $u->full_name,
            'email'          => $u->email,
            'role'           => $u->role,
            'tenant_id'      => $u->tenant_id,
            'storeId'        => $u->tenant_id,
            // Trial info
            'trial_ends_at'  => $store?->trial_ends_at?->toISOString(),
            'trialDaysLeft'  => $store ? $store->trialDaysLeft() : 0,
            'store_status'   => $store?->status,
            // Plan info
            'plan'           => $store?->plan,
            'plan_limits'    => $store ? $planSvc->getLimits($store) : null,
        ];
    });

    // ── Rutas abiertas a TODOS los roles autenticados ───────────
    // Sincronización Outbox (Drain Loop) — Ventas (SyncController)
    Route::post('/sync/events', [SyncController::class, 'processBatch'])
        ->middleware('throttle:30,1'); // 30 requests/min por tenant (≈1 batch cada 2s)

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
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('/saas/metrics', [SaasMetricsController::class, 'metrics']);

        // ── Gestión de Sesiones / Dispositivos ──────────
        Route::get('/saas/sessions/{storeId}', [\App\Http\Controllers\Api\SaasController::class, 'listSessions']);
        Route::delete('/saas/sessions/{tokenId}', [\App\Http\Controllers\Api\SaasController::class, 'revokeSession']);

        // ── Gestión de Planes ────────────────────────────
        Route::get('/saas/plans/limits/{storeId}', [\App\Http\Controllers\Api\SaasController::class, 'planLimits']);
        Route::post('/saas/plans/change', [\App\Http\Controllers\Api\SaasController::class, 'changePlan']);
        Route::post('/saas/plans/extend-trial', [\App\Http\Controllers\Api\SaasController::class, 'extendTrial']);
    });
});

// ── Módulo Quiniela removido (Julio 2026) ───────────────────────────
// Las tablas quiniela_players, quiniela_matches, y quiniela_predictions
// permanecen en BD para preservar datos históricos si es necesario.
// Se pueden eliminar con una migración futura.

