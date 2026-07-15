<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Store;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * SendTrialReminders — Notifica a tenants cuyo trial está por expirar.
 *
 * Se ejecuta diariamente vía scheduler (app/Console/Kernel.php):
 *   $schedule->command('merx:send-trial-reminders')->dailyAt('08:00');
 *
 * Notifica:
 *   - 7 días antes: recordatorio amable
 *   - 1 día antes: urgencia
 *
 * El "recordatorio" actualmente es un log + puede extenderse a email
 * cuando MAIL_MAILER esté configurado.
 */
class SendTrialReminders extends Command
{
    protected $signature = 'merx:send-trial-reminders';
    protected $description = 'Envía recordatorios de expiración de trial a tenants';

    public function handle(): int
    {
        $now = Carbon::now();

        // ── 7 días antes ────────────────────────────────────
        $in7Days = $now->copy()->addDays(7)->startOfDay();
        $stores7 = Store::whereNotNull('trial_ends_at')
            ->where('status', 'active')
            ->whereBetween('trial_ends_at', [$in7Days, $in7Days->copy()->endOfDay()])
            ->get();

        foreach ($stores7 as $store) {
            $this->line("[TRIAL] 7 días restantes: {$store->name} ({$store->id}) — {$store->owner_email}");
            // TODO: enviar email cuando MAIL_MAILER esté configurado
            // Mail::to($store->owner_email)->send(new TrialExpiringMail($store, 7));
        }

        // ── 1 día antes ─────────────────────────────────────
        $tomorrow = $now->copy()->addDay()->startOfDay();
        $stores1 = Store::whereNotNull('trial_ends_at')
            ->where('status', 'active')
            ->whereBetween('trial_ends_at', [$tomorrow, $tomorrow->copy()->endOfDay()])
            ->get();

        foreach ($stores1 as $store) {
            $this->line("[TRIAL] ÚLTIMO DÍA: {$store->name} ({$store->id}) — {$store->owner_email}");
            // TODO: enviar email urgente
        }

        $total = $stores7->count() + $stores1->count();
        $this->info("Recordatorios enviados: {$total}");

        return self::SUCCESS;
    }
}
