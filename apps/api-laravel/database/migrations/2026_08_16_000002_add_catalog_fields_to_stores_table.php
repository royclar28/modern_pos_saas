<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('whatsapp_number')->nullable()->after('owner_email');
            $table->boolean('catalog_enabled')->default(true)->after('whatsapp_number');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_number', 'catalog_enabled']);
        });
    }
};
