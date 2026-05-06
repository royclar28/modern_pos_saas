<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Notifications\WelcomeUserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SaasController extends Controller
{
    public function index(Request $request)
    {
        $stores = Store::orderBy('created_at', 'desc')->get()->map(function ($store) {
            // Obtener el primer usuario admin de la tienda como propietario
            $owner = $store->users()->where('role', 'ADMIN')->first();

            return [
                'id'         => $store->id,
                'name'       => $store->name,
                'rif'        => $store->rif ?? 'N/A',
                'ownerEmail' => $store->owner_email ?? ($owner?->email ?? 'N/A'),
                'plan'       => $store->plan ?? 'STANDARD',
                'isActive'   => $store->is_active,
                'createdAt'  => $store->created_at->toISOString(),
            ];
        });

        return response()->json([
            'items' => $stores,
            'total' => $stores->count(),
        ]);
    }

    public function createStore(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:255',
            'ownerEmail' => 'required|email|unique:users,email',
            'ownerName'  => 'required|string|max:255',
            'plan'       => 'nullable|in:STANDARD,PRO,ENTERPRISE',
            'rif'        => 'nullable|string|max:20',
        ]);

        $temporaryPassword = Str::password(12, symbols: false);

        DB::transaction(function () use ($request, $temporaryPassword) {
            // 1. Crear la tienda
            $store = Store::create([
                'id'          => Str::uuid()->toString(),
                'name'        => $request->input('name'),
                'rif'         => $request->input('rif'),
                'owner_email' => $request->input('ownerEmail'),
                'plan'        => $request->input('plan', 'STANDARD'),
                'is_active'   => true,
            ]);

            // 2. Crear el usuario administrador de la tienda
            $nameParts = explode(' ', trim($request->input('ownerName')), 2);
            $user = User::create([
                'tenant_id'  => $store->id,
                'first_name' => $nameParts[0],
                'last_name'  => $nameParts[1] ?? '',
                'email'      => $request->input('ownerEmail'),
                'username'   => Str::slug($nameParts[0] . '_' . ($nameParts[1] ?? ''), '_'),
                'password'   => Hash::make($temporaryPassword),
                'role'       => 'ADMIN',
            ]);

            // 3. Enviar el correo de bienvenida con las credenciales
            $user->notify(new WelcomeUserNotification($temporaryPassword));
        });

        return response()->json([
            'message' => 'Tienda creada exitosamente. Se ha enviado un correo al administrador con sus credenciales de acceso.',
        ], 201);
    }

    public function toggleStatus(Request $request, $id)
    {
        $store = Store::findOrFail($id);
        $store->update(['is_active' => $request->boolean('isActive')]);

        return response()->json([
            'message'  => 'Estado actualizado correctamente.',
            'isActive' => $store->is_active,
        ]);
    }
}
