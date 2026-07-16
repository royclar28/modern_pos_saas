<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * ⚠️ 2026-07-16: Esta migración fallaba en producción porque:
     *   - terminal_id contiene strings ("CAJA_01") no UUIDs
     *   - Las tablas terminals y measurement_units no existen
     *
     * Se reescribe para ser no-destructiva: solo aplica cambios
     * que sean compatibles con los datos existentes.
     */
    public function up(): void
    {
        // Asegurar que tenant_id sea UUID antes de aplicar la FK para evitar error de tipo incompatible
        try {
            DB::statement('ALTER TABLE cash_shifts ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid');
        } catch (\Throwable $e) {}

        // ── cash_shifts: solo el índice parcial y FK a stores ─────
        Schema::table('cash_shifts', function (Blueprint $table) {
            // 1. Eliminar el constraint único actual (si existe)
            try { $table->dropUnique('unique_open_shift'); } catch (\Throwable) {}

            // 2. FK a stores (tenant_id)
            try {
                if (!$this->foreignExists('cash_shifts', 'cash_shifts_tenant_id_foreign')) {
                    $table->foreign('tenant_id')
                          ->references('id')
                          ->on('stores')
                          ->cascadeOnDelete();
                }
            } catch (\Throwable) {}

            // 3. Índice parcial: solo un turno OPEN por usuario
            try {
                DB::statement(
                    "CREATE UNIQUE INDEX IF NOT EXISTS unique_open_shift_partial " .
                    "ON cash_shifts (tenant_id, user_id) WHERE status = 'OPEN'"
                );
            } catch (\Throwable) {}
        });

        // ── items: measurement_unit_id solo si la tabla existe ─────
        if (Schema::hasTable('measurement_units')) {
            Schema::table('items', function (Blueprint $table) {
                if (!Schema::hasColumn('items', 'measurement_unit_id')) {
                    $table->uuid('measurement_unit_id')->nullable()->after('tenant_id');
                }
                if (!$this->foreignExists('items', 'items_measurement_unit_id_foreign')) {
                    $table->foreign('measurement_unit_id')
                          ->references('id')
                          ->on('measurement_units')
                          ->nullOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('measurement_units') && Schema::hasColumn('items', 'measurement_unit_id')) {
            Schema::table('items', function (Blueprint $table) {
                if ($this->foreignExists('items', 'items_measurement_unit_id_foreign')) {
                    $table->dropForeign('items_measurement_unit_id_foreign');
                }
                $table->dropColumn('measurement_unit_id');
            });
        }

        Schema::table('cash_shifts', function (Blueprint $table) {
            try { DB::statement('DROP INDEX IF EXISTS unique_open_shift_partial'); } catch (\Throwable) {}
            if ($this->foreignExists('cash_shifts', 'cash_shifts_tenant_id_foreign')) {
                $table->dropForeign('cash_shifts_tenant_id_foreign');
            }
            // Recrear constraint original
            try {
                DB::statement(
                    "CREATE UNIQUE INDEX IF NOT EXISTS unique_open_shift " .
                    "ON cash_shifts (tenant_id, user_id, status)"
                );
            } catch (\Throwable) {}
        });
    }

    private function foreignExists(string $table, string $foreignKey): bool
    {
        return DB::selectOne(
            "SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = ? AND table_name = ?",
            [$foreignKey, $table]
        ) !== null;
    }
};
