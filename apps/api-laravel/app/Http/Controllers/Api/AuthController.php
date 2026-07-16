<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SessionService;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function __construct(
        private readonly SessionService $sessions,
        private readonly PlanService $plans,
    ) {}

    public function login(Request $request)
    {
        $request->validate([
            'username'  => 'required|string',
            'password'  => 'required',
        ]);

        $user = User::where(function ($query) use ($request) {
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

        // ── Device authorization ───────────────────────────────
        try {
            $fingerprint = $this->sessions->authorizeDevice($user->store, $request);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'code'    => 'DEVICE_LIMIT_REACHED',
            ], 403);
        }

        $deviceName = $request->header('X-Device-Name', 'POS Terminal');

        // ── Issue token with device metadata ──────────────────
        $token = $user->createToken('pos-v1');
        $accessToken = $token->accessToken;
        $accessToken->device_fingerprint = $fingerprint;
        $accessToken->device_name        = $deviceName;
        $accessToken->ip_address         = $request->ip();
        $accessToken->last_activity_at   = now();
        $accessToken->save();

        $store = $user->store;

        return response()->json([
            'status' => 'ok',
            'token'  => $token->plainTextToken,
            'user'   => [
                'id'             => $user->id,
                'username'       => $user->username,
                'name'           => $user->full_name,
                'email'          => $user->email,
                'tenant_id'      => $user->tenant_id,
                'role'           => $user->role,
                'trial_ends_at'  => $store?->trial_ends_at?->toISOString(),
                'trialDaysLeft'  => $store ? $store->trialDaysLeft() : 0,
                'plan'           => $store?->plan,
                'plan_limits'    => $store ? $this->plans->getLimits($store) : null,
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
