<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RoleMiddleware — RBAC Gate para rutas API.
 *
 * Uso en rutas:
 *   ->middleware('role:ADMIN,MANAGER')
 *
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Retorna 403 Forbidden si no tiene acceso.
 */
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No autenticado.',
            ], 401);
        }

        // Normalize: accept both STORE_ADMIN and ADMIN as equivalent
        $userRole = $user->role;
        $allowed = collect($roles)->map(fn ($r) => strtoupper(trim($r)));

        // SUPER_ADMIN bypasses all role checks
        if ($userRole === 'SUPER_ADMIN') {
            return $next($request);
        }

        if (!$allowed->contains($userRole)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No tienes permiso para acceder a este recurso.',
                'required_roles' => $allowed->values()->toArray(),
                'your_role' => $userRole,
            ], 403);
        }

        return $next($request);
    }
}
