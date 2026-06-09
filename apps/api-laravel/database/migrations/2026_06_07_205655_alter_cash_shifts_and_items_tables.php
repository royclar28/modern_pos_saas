<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cash_shifts', function (Blueprint $table) {
            // 1. Eliminar el constraint actual
            $table->dropUnique('unique_open_shift');

            // 2. Modificar 'terminal_id' a tipo uuid
            $table->uuid('terminal_id')->change();

            // 3. Agregar las llaves foráneas requeridas
            $table->foreign('tenant_id')
                  ->references('id')
                  ->on('stores')
                  ->cascadeOnDelete();

            $table->foreign('terminal_id')
                  ->references('id')
                  ->on('terminals')
                  ->cascadeOnDelete();

            // 4. Crear índice único parcial
            $table->unique(['tenant_id', 'user_id'], 'unique_open_shift_partial')
                  ->where('status', 'OPEN');
        });

        Schema::table('items', function (Blueprint $table) {
            // 1. Agregar 'measurement_unit_id' como UUID y Nullable
            $table->uuid('measurement_unit_id')->nullable()->after('tenant_id');

            // 2. Agregar llave foránea a 'measurement_units'
            $table->foreign('measurement_unit_id')
                  ->references('id')
                  ->on('measurement_units')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['measurement_unit_id']);
            $table->dropColumn('measurement_unit_id');
        });

        Schema::table('cash_shifts', function (Blueprint $table) {
            // Revertir el índice parcial y las foráneas
            $table->dropUnique('unique_open_shift_partial');
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['terminal_id']);

            // Revertir terminal_id a string (varchar)
            $table->string('terminal_id')->change();

            // Recrear el constraint original
            $table->unique(['tenant_id', 'user_id', 'status'], 'unique_open_shift');
        });
    }
};
