<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            // Fingerprint único del dispositivo: hash de IP + navegador
            $table->string('device_fingerprint', 64)->nullable()->after('abilities');
            // Nombre legible asignado por el usuario o auto-detectado
            $table->string('device_name', 100)->nullable()->after('device_fingerprint');
            // Última IP conocida
            $table->string('ip_address', 45)->nullable()->after('device_name');
            // Última actividad registrada (cada request autenticado lo actualiza)
            $table->timestamp('last_activity_at')->nullable()->after('ip_address');

            $table->index(['tokenable_type', 'tokenable_id', 'device_fingerprint'], 'idx_token_device');
            $table->index('last_activity_at');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex('idx_token_device');
            $table->dropIndex(['last_activity_at']);
            $table->dropColumn(['device_fingerprint', 'device_name', 'ip_address', 'last_activity_at']);
        });
    }
};
