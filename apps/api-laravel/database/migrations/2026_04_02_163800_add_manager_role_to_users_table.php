<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Normalizar roles de usuario a ADMIN / MANAGER / CASHIER.
 *
 * - Convierte STORE_ADMIN → ADMIN (manteniendo compatibilidad)
 * - Añade soporte para el rol MANAGER
 * - Mantiene SUPER_ADMIN intacto (acceso SaaS root)
 * - Default permanece como CASHIER
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Normalizar STORE_ADMIN existentes → ADMIN
        DB::table('users')
            ->where('role', 'STORE_ADMIN')
            ->update(['role' => 'ADMIN']);

        // 2. Cambiar el default de la columna a CASHIER (ya lo es, pero lo reforzamos)
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('CASHIER')->change();
        });

        // 3. Añadir un comentario/doc en la columna para referencia
        // Roles válidos: SUPER_ADMIN, ADMIN, MANAGER, CASHIER
    }

    public function down(): void
    {
        // Revertir ADMIN → STORE_ADMIN
        DB::table('users')
            ->where('role', 'ADMIN')
            ->update(['role' => 'STORE_ADMIN']);

        // Revertir MANAGER → CASHIER (no existía antes)
        DB::table('users')
            ->where('role', 'MANAGER')
            ->update(['role' => 'CASHIER']);
    }
};
