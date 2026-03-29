<?php

use App\Http\Controllers\Api\SyncController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// ── Sync Events (Drain Loop del frontend) ───────────────────────
Route::post('/sync/events', [SyncController::class, 'processBatch']);
