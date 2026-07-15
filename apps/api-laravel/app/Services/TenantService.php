<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Category;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * TenantService — Lógica de negocio para creación de tenants.
 *
 * Centraliza la creación de Store + User ADMIN + categorías default
 * en una transacción atómica. Lo usan:
 *   - TenantRegistrationController (registro público)
 *   - SaasController (creación por SUPER_ADMIN)
 */
class TenantService
{
    /**
     * Crea un nuevo tenant con su usuario ADMIN, categorías default,
     * y opcionalmente envía el correo de configuración de contraseña.
     *
     * @param  array   $data   Requiere: name, ownerEmail, ownerName (opcional), plan (opcional), rif (opcional)
     * @param  bool    $sendWelcomeEmail  Si es true, envía TenantCredentialsMail
     * @return array   ['store' => Store, 'user' => User, 'token' => ?string]
     */
    public function createTenant(array $data, bool $sendWelcomeEmail = false): array
    {
        return DB::transaction(function () use ($data, $sendWelcomeEmail) {
            // ── 1. Store ──────────────────────────────────────
            $store = Store::create([
                'id'            => (string) Str::uuid(),
                'name'          => $data['name'],
                'rif'           => $data['rif'] ?? null,
                'owner_email'   => $data['ownerEmail'],
                'plan'          => $data['plan'] ?? 'STANDARD',
                'is_active'     => true,
                'trial_ends_at' => $data['trial_ends_at'] ?? Carbon::now()->addDays(30),
                'status'        => 'active',
            ]);

            // ── 2. Usuario ADMIN ─────────────────────────────
            $ownerName = $data['ownerName']
                ?? ucfirst(explode('@', $data['ownerEmail'])[0]);

            $nameParts = explode(' ', trim($ownerName), 2);

            $password = $sendWelcomeEmail
                ? Hash::make(Str::random(40)) // hash inaccesible — solo vía reset
                : Hash::make(Str::password(12, symbols: false));

            $user = User::create([
                'tenant_id'  => $store->id,
                'first_name' => $nameParts[0],
                'last_name'  => $nameParts[1] ?? '',
                'email'      => $data['ownerEmail'],
                'username'   => $data['username'] ?? explode('@', $data['ownerEmail'])[0],
                'password'   => $password,
                'role'       => 'ADMIN',
            ]);

            // ── 3. Categorías default ────────────────────────
            $defaultCategories = [
                ['name' => 'Lácteos', 'sort_order' => 1],
                ['name' => 'Bebidas', 'sort_order' => 2],
                ['name' => 'Víveres', 'sort_order' => 3],
                ['name' => 'Otros',   'sort_order' => 4],
            ];

            foreach ($defaultCategories as $cat) {
                Category::create([
                    'id'         => (string) Str::uuid(),
                    'tenant_id'  => $store->id,
                    'name'       => $cat['name'],
                    'sort_order' => $cat['sort_order'],
                ]);
            }

            // ── 4. Token de configuración (solo si envía email)
            $token = null;
            if ($sendWelcomeEmail) {
                $token = Password::broker()->createToken($user);
            }

            return [
                'store' => $store,
                'user'  => $user,
                'token' => $token,
            ];
        });
    }
}
