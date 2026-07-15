<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\TenantService;
use App\Services\PlanService;
use App\Services\SessionService;
use App\Enums\Plan;
use Illuminate\Http\Request;

class SaasController extends Controller
{
    public function __construct(
        private readonly TenantService $tenants,
        private readonly PlanService $plans,
        private readonly SessionService $sessions,
    ) {}

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
            'ownerEmail' => ['required', 'email', \Illuminate\Validation\Rule::unique('users', 'email')->whereNull('deleted_at')],
            'ownerName'  => 'nullable|string|max:255',
            'plan'       => 'nullable|in:STANDARD,PRO,ENTERPRISE',
            'rif'        => 'nullable|string|max:20',
        ]);

        $result = $this->tenants->createTenant([
            'name'       => $request->input('name'),
            'ownerEmail' => $request->input('ownerEmail'),
            'ownerName'  => $request->input('ownerName'),
            'plan'       => $request->input('plan', 'STANDARD'),
            'rif'        => $request->input('rif'),
        ], sendWelcomeEmail: false);

        return response()->json([
            'message' => 'Tienda creada exitosamente.',
            'storeId' => $result['store']->id,
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

    // ─── Plan Management (SUPER_ADMIN only) ─────────────────

    /**
     * GET /api/saas/plans/limits/{storeId}
     * Devuelve los límites del plan actual del tenant.
     */
    public function planLimits(string $storeId): \Illuminate\Http\JsonResponse
    {
        $store = Store::findOrFail($storeId);
        return response()->json($this->plans->getLimits($store));
    }

    /**
     * POST /api/saas/plans/change
     * Body: { storeId, plan }
     * Cambia el plan de un tenant. Marca trial_ends_at = null.
     */
    public function changePlan(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'storeId' => 'required|uuid|exists:stores,id',
            'plan'    => ['required', 'string', 'in:' . implode(',', array_column(Plan::cases(), 'value'))],
        ]);

        $store = Store::findOrFail($request->storeId);
        $plan  = Plan::from($request->plan);

        $this->plans->changePlan($store, $plan, $request->user());

        return response()->json([
            'message' => "Plan cambiado a {$plan->label()}.",
            'limits'  => $this->plans->getLimits($store->fresh()),
        ]);
    }

    /**
     * POST /api/saas/plans/extend-trial
     * Body: { storeId, days? }
     * Extiende el trial N días. Default: 15.
     */
    public function extendTrial(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'storeId' => 'required|uuid|exists:stores,id',
            'days'    => 'nullable|integer|min:1|max:90',
        ]);

        $store = Store::findOrFail($request->storeId);
        $this->plans->extendTrial($store, $request->integer('days', 15));

        return response()->json([
            'message'       => "Trial extendido {$request->integer('days', 15)} días.",
            'trial_ends_at' => $store->fresh()->trial_ends_at?->toISOString(),
        ]);
    }

    // ─── Session Management (SUPER_ADMIN only) ──────────────

    public function listSessions(string $storeId): \Illuminate\Http\JsonResponse
    {
        $store = Store::findOrFail($storeId);
        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;

        return response()->json([
            'store'    => $store->name,
            'plan'     => $plan->label(),
            'max_devices' => $plan->maxDevices(),
            'active_devices' => $this->sessions->countActiveDevices($store->id),
            'sessions' => $this->sessions->getActiveSessions($store->id),
        ]);
    }

    public function revokeSession(string $tokenId): \Illuminate\Http\JsonResponse
    {
        $this->sessions->revokeSession($tokenId);

        return response()->json(['message' => 'Sesión revocada.']);
    }
}
