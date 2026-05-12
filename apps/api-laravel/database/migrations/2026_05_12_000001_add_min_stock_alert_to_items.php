<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega columna min_stock_alert a la tabla items.
 *
 * Permite definir un umbral por producto para disparar alertas
 * visuales en el POS cuando el stock sea igual o inferior al valor.
 * null = sin alerta configurada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->decimal('min_stock_alert', 15, 2)
                  ->nullable()
                  ->default(null)
                  ->after('reorder_level')
                  ->comment('Umbral de alerta de stock mínimo. null = sin alerta.');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('min_stock_alert');
        });
    }
};
