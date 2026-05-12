<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cambia el valor por defecto de tax_percent en la tabla sales de 16 a 0.
 *
 * La quesera no aplica IVA. El valor configurable por tenant
 * sigue disponible en store_configs (default_tax_rate).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('tax_percent', 5, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('tax_percent', 5, 2)->default(16)->change();
        });
    }
};
