<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable();
            $table->index(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->uuid('user_id')->nullable();
            $table->index(['tenant_id', 'user_id']);
        });
    }
};
