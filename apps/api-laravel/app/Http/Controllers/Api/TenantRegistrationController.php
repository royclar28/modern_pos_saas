<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Mail\TenantCredentialsMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

/**
 * TenantRegistrationController — Registro público de nuevos tenants.
 *
 * 🔒 SECURITY: We NEVER send plaintext passwords via email. Instead, we
 *     create the user with an unguessable random hash and immediately
 *     issue a password-reset token via Laravel's Password Broker. The
 *     welcome email contains a link to a setup-password page on the
 *     frontend SPA where the user chooses their own password.
 *
 * Flujo:
 *   1. Validar datos del formulario de registro
 *   2. Crear Store con trial_ends_at = now() + 30 días
 *   3. Crear usuario STORE_ADMIN con hash aleatorio (nadie lo conoce)
 *   4. Generar token de "primer uso" con Password::broker()->createToken()
 *   5. Enviar correo con enlace /setup-password?token=&email=
 *   6. Retornar 201 (sin token — el usuario debe configurar su contraseña)
 *
 * Ruta pública: POST /api/register
 */
class TenantRegistrationController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'store_name' => 'required|string|max:255',
            'username'   => ['required', 'string', 'max:50', 'alpha_dash', \Illuminate\Validation\Rule::unique('users', 'username')->whereNull('deleted_at')],
            'email'      => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')->whereNull('deleted_at')],
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

            // ── 2. Crear el usuario STORE_ADMIN con hash aleatorio ────────
            // 🔒 Criptográficamente seguro: 40 bytes aleatorios que NADIE
            //     conoce (ni el sistema, ni el admin, ni un atacante).
            //     El único camino para acceder es a través del enlace de
            //     configuración de contraseña enviado por correo.
            $user = User::create([
                'tenant_id'  => $store->id,
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name ?? '',
                'email'      => $request->email,
                'username'   => $request->username,
                'password'   => Hash::make(Str::random(40)),
                'role'       => 'ADMIN',
            ]);

            // ── 3. Generar token de "primer uso" vía Password Broker ──────
            //     Reutiliza la infraestructura nativa de Laravel
            //     (tabla password_reset_tokens, expiración en config/auth.php).
            $token = Password::broker()->createToken($user);

            // ── 4. Correo de bienvenida con enlace seguro ─────────────────
            Mail::to($user->email)->send(new TenantCredentialsMail($user, $token));

            return $user;
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Tenant creado exitosamente. Se ha enviado un correo para que configures tu contraseña.',
        ], 201);
    }
}
