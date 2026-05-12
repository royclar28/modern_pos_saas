<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Notifications\WelcomeUserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

/**
 * TenantRegistrationController — Registro público de nuevos tenants.
 *
 * Flujo:
 *   1. Validar datos del formulario de registro
 *   2. Crear Store con trial_ends_at = now() + 30 días
 *   3. Crear usuario STORE_ADMIN con contraseña elegida por el usuario
 *   4. Enviar correo de bienvenida
 *   5. Retornar token de acceso inmediato (no requiere login extra)
 *
 * Ruta pública: POST /api/register
 */
class TenantRegistrationController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'store_name' => 'required|string|max:255',
            'username'   => 'required|string|max:50|alpha_dash|unique:users,username',
            'email'      => 'required|email|max:255|unique:users,email',
            'password'   => 'required|string|min:8|confirmed',
            'first_name' => 'required|string|max:100',
            'last_name'  => 'nullable|string|max:100',
        ]);

        $user = DB::transaction(function () use ($request) {

            // ── 1. Crear el Tenant (Store) con trial de 30 días ───────────
            $store = Store::create([
                'id'            => Str::uuid()->toString(),
                'name'          => $request->store_name,
                'owner_email'   => $request->email,
                'plan'          => 'TRIAL',
                'is_active'     => true,
                'trial_ends_at' => Carbon::now()->addDays(30),
                'status'        => 'active',
            ]);

            // ── 1.1 Seed de categorías por defecto ───────────────────────
            $defaultCategories = [
                ['name' => 'Lácteos',   'sort_order' => 1],
                ['name' => 'Bebidas',   'sort_order' => 2],
                ['name' => 'Víveres',   'sort_order' => 3],
                ['name' => 'Otros',     'sort_order' => 4],
            ];

            foreach ($defaultCategories as $cat) {
                \App\Models\Category::create([
                    'id'         => Str::uuid()->toString(),
                    'tenant_id'  => $store->id,
                    'name'       => $cat['name'],
                    'sort_order' => $cat['sort_order'],
                ]);
            }

            // ── 2. Crear el usuario STORE_ADMIN ───────────────────────────
            $user = User::create([
                'tenant_id'  => $store->id,
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name ?? '',
                'email'      => $request->email,
                'username'   => $request->username,
                'password'   => Hash::make($request->password),
                'role'       => 'ADMIN',
            ]);

            // ── 3. Correo de bienvenida (incluye fecha de expiración) ─────
            // Reutilizamos WelcomeUserNotification pero pasamos la password
            // real para que el usuario ya sepa sus credenciales.
            $user->notify(new WelcomeUserNotification($request->password));

            return $user;
        });

        // ── 4. Emitir token de acceso inmediato ───────────────────────────
        $token = $user->createToken('pos-v1')->plainTextToken;

        return response()->json([
            'status'  => 'ok',
            'message' => '¡Registro exitoso! Tu período de prueba de 30 días ha comenzado.',
            'token'   => $token,
            'user'    => [
                'id'        => $user->id,
                'username'  => $user->username,
                'name'      => $user->full_name,
                'email'     => $user->email,
                'tenant_id' => $user->tenant_id,
                'role'      => $user->role,
            ],
            'trial' => [
                'ends_at'     => $user->store->trial_ends_at->toISOString(),
                'days_left'   => 30,
            ],
        ], 201);
    }
}
