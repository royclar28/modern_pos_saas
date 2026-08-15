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
        Schema::table('raffle_participants', function (Blueprint $table) {
            $table->dropUnique(['raffle_id', 'ticket_number']);
            $table->dropColumn('ticket_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('raffle_participants', function (Blueprint $table) {
            $table->string('ticket_number')->nullable();
            // $table->unique(['raffle_id', 'ticket_number']); // No recrear constraint exacto si hay nulos
        });
    }
};
