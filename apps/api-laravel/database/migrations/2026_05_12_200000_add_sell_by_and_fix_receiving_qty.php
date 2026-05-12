<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregar columna sell_by (cómo se vende el producto)
        if (!Schema::hasColumn('items', 'sell_by')) {
            Schema::table('items', function (Blueprint $table) {
                $table->string('sell_by', 10)->default('unit')->after('is_serialized');
                // valores: 'unit' | 'weight'
                $table->index(['tenant_id', 'sell_by']);
            });
        }

        // 2. Corregir receiving_quantity: integer → decimal
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL: ALTER COLUMN TYPE con USING explícito
            DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity TYPE DECIMAL(15,2)');
            DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity SET DEFAULT 1');
        } elseif ($driver === 'sqlite') {
            // SQLite no soporta ALTER COLUMN TYPE; la migración se aplica
            // completa en PostgreSQL (producción). En SQLite el cast
            // decimal:2 en el modelo Eloquent maneja la conversión.
            DB::statement('PRAGMA journal_mode=WAL');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('items', 'sell_by')) {
            Schema::table('items', function (Blueprint $table) {
                $table->dropIndex(['tenant_id', 'sell_by']);
                $table->dropColumn('sell_by');
            });
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // Revertir a integer (puede perder precisión si hay decimales > 0)
            DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity TYPE INTEGER USING (receiving_quantity::INTEGER)');
        }
    }
};
