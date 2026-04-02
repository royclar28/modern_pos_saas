<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required',
        ]);

        // Disable global scopes to find the user across all tenants.
        // Once logged in, the token will be associated with this user
        // and its inherent tenant_id will be scoped automatically in subsequent requests.
        $user = User::withoutGlobalScopes()
                    ->where('username', $request->username)
                    ->orWhere('email', $request->username)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Credenciales inválidas.',
            ], 401);
        }

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
            ]
        ]);
    }
}
