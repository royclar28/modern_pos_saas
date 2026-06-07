<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Authenticate a user within a specific tenant.
     *
     * 🔒 CRITICAL SECURITY: This method MUST receive the tenant_id from the
     *     client to guarantee cross-tenant isolation. The POS client knows its
     *     tenant because it's configured during initial setup (offline-first).
     *
     *     The query is built with an explicit tenant_id filter AND grouped
     *     OR conditions to prevent the classic "WHERE tenant_id = ? AND
     *     username = ? OR email = ?" SQL logic bypass.
     *
     * @see https://laravel.com/docs/11.x/queries#logical-grouping
     */
    public function login(Request $request)
    {
        $request->validate([
            'tenant_id' => 'required|string|size:36|exists:stores,id',
            'username'  => 'required|string',
            'password'  => 'required',
        ]);

        // ── Find user scoped to the explicit tenant ────────────────
        // We do NOT use withoutGlobalScopes() here. Instead we build the
        // query manually with an explicit tenant_id filter and grouped
        // OR conditions to guarantee tenant isolation.
        $user = User::where('tenant_id', $request->tenant_id)
                    ->where(function ($query) use ($request) {
                        $query->where('username', $request->username)
                              ->orWhere('email', $request->username);
                    })
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Credenciales inválidas.',
            ], 401);
        }

        // Revoke previous tokens for this user (optional, but good practice
        // to limit active sessions).
        // $user->tokens()->delete();

        // Issue Sanctum Token
        $token = $user->createToken('pos-v1')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'token'  => $token,
            'user'   => [
                'id'         => $user->id,
                'username'   => $user->username,
                'name'       => $user->full_name,
                'email'      => $user->email,
                'tenant_id'  => $user->tenant_id,
                'role'       => $user->role,
                'trial_ends_at' => $user->store && $user->store->trial_ends_at ? $user->store->trial_ends_at->toIso8601String() : null,
            ]
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'currentPassword' => 'required',
            'newPassword'     => 'required|min:6',
        ]);

        $user = $request->user();

        if (!Hash::check($request->currentPassword, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'La contraseña actual es incorrecta.',
            ], 400);
        }

        $user->password = Hash::make($request->newPassword);
        $user->save();

        return response()->json([
            'status'  => 'ok',
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }
}
