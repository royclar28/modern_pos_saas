<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar columnas UUID erróneas e índices
        Schema::table('processed_sync_events', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        // Crear columnas con el tipo correcto (unsignedBigInteger) para que coincidan con users.id
        Schema::table('processed_sync_events', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('tenant_id');
            $table->index(['tenant_id', 'user_id']);
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('tenant_id');
            $table->index(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('processed_sync_events', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('processed_sync_events', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->after('tenant_id');
            $table->index(['tenant_id', 'user_id']);
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->after('tenant_id');
            $table->index(['tenant_id', 'user_id']);
        });
    }
};
