<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Plan;
use App\Models\Store;
use App\Models\User;
use App\Models\Item;
use Illuminate\Support\Carbon;

/**
 * PlanService — Feature gating y gestión de suscripciones.
 *
 * Centraliza:
 *   - Verificar si un tenant puede realizar una acción (crear usuarios, items, etc.)
 *   - Cambiar de plan (manual, por SUPER_ADMIN)
 *   - Activar/desactivar trial
 *   - Renovar (extender trial o marcar como pagado)
 */
class PlanService
{
    /**
     * Cambiar el plan de un tenant.
     * Solo SUPER_ADMIN puede invocarlo (validado en controller).
     */
    public function changePlan(Store $store, Plan $newPlan, ?User $changedBy = null): void
    {
        $oldPlan = $store->plan;

        $store->update([
            'plan'            => $newPlan->value,
            'trial_ends_at'   => null, // plan pagado = sin trial
            'status'          => 'active',
            'plan_changed_at' => now(),
        ]);

        // Auditoría
        app(AuditService::class)->log(
            entityType: 'store',
            entityId: $store->id,
            action: 'PLAN_CHANGE',
            oldValues: ['plan' => $oldPlan],
            newValues: ['plan' => $newPlan->value],
            metadata: [
                'changed_by' => $changedBy?->id,
                'price'      => $newPlan->price(),
            ],
        );
    }

    /**
     * Extender el trial N días (renovación manual).
     */
    public function extendTrial(Store $store, int $days = 30): void
    {
        $newEndsAt = ($store->trial_ends_at && Carbon::now()->lessThan($store->trial_ends_at))
            ? $store->trial_ends_at->addDays($days)
            : Carbon::now()->addDays($days);

        $store->update([
            'trial_ends_at' => $newEndsAt,
            'status'        => 'active',
        ]);

        app(AuditService::class)->log(
            entityType: 'store',
            entityId: $store->id,
            action: 'TRIAL_EXTEND',
            newValues: ['trial_ends_at' => $newEndsAt->toISOString()],
        );
    }

    // ─── Feature Checks ─────────────────────────────────────

    /** ¿El tenant puede crear más usuarios? */
    public function canCreateUser(Store $store): bool
    {
        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;
        $currentCount = User::where('tenant_id', $store->id)->count();
        return $currentCount < $plan->maxUsers();
    }

    /** ¿El tenant puede crear más items? */
    public function canCreateItem(Store $store): bool
    {
        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;
        $currentCount = Item::where('tenant_id', $store->id)->count();
        return $currentCount < $plan->maxItems();
    }

    /** ¿El tenant tiene habilitados los fiados? */
    public function allowsCreditSales(Store $store): bool
    {
        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;
        return $plan->allowsCreditSales();
    }

    /** Obtener los límites actuales del plan del tenant. */
    public function getLimits(Store $store): array
    {
        $plan = Plan::tryFrom($store->plan) ?? Plan::TRIAL;

        return [
            'plan'            => $plan->value,
            'plan_label'      => $plan->label(),
            'plan_color'      => $plan->color(),
            'price'           => $plan->price(),
            'max_devices'     => $plan->maxDevices(),
            'max_users'       => $plan->maxUsers(),
            'current_users'   => User::where('tenant_id', $store->id)->count(),
            'max_items'       => $plan->maxItems(),
            'current_items'   => Item::where('tenant_id', $store->id)->count(),
            'credit_sales'    => $plan->allowsCreditSales(),
            'advanced_reports'=> $plan->allowsAdvancedReports(),
            'payment_methods' => $plan->allowedPaymentMethods(),
            'trial_ends_at'   => $store->trial_ends_at?->toISOString(),
            'is_trial_active' => $store->isOnTrial(),
            'is_trial_expired'=> $store->trialHasExpired(),
        ];
    }
}
