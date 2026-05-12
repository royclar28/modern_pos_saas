<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega campos de ciclo de vida del trial a la tabla stores.
 *
 * trial_ends_at : Cuándo expira el período de prueba (null = sin prueba / plan pagado)
 * status        : Estado del tenant: 'active' | 'trial_expired' | 'suspended'
 *
 * Los tenants existentes quedan con status='active' y trial_ends_at=null
 * (se los considera ya confirmados/pagados — no se les aplica el bloqueo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')
                  ->nullable()
                  ->default(null)
                  ->after('plan')
                  ->comment('Fecha de expiración del trial. null = plan activo/pagado.');

            $table->string('status', 20)
                  ->default('active')
                  ->after('trial_ends_at')
                  ->comment('active | trial_expired | suspended');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['trial_ends_at', 'status']);
        });
    }
};
