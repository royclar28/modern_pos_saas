<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use App\Services\SessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * TouchSessionMiddleware — Actualiza last_activity_at en cada request autenticado.
 *
 * Se ejecuta después de auth:sanctum. Si el token tiene device_fingerprint,
 * actualiza la marca de actividad para que la sesión siga contando como "viva".
 *
 * Registro: bootstrap/app.php
 *   ->withMiddleware(function (Middleware $middleware) {
 *       $middleware->alias(['touch.session' => TouchSessionMiddleware::class]);
 *   })
 *
 * Uso: Route::middleware(['auth:sanctum', 'touch.session'])->group(...)
 */
class TouchSessionMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = Auth::user();
        if ($user && $token = $user->currentAccessToken()) {
            if ($token->device_fingerprint) {
                app(SessionService::class)->touchSession($token, $request);
            }
        }

        return $response;
    }
}
