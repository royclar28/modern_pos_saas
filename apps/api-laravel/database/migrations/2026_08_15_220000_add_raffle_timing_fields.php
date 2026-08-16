<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            // Hora programada de inicio del sorteo (para el countdown)
            $table->timestamp('starts_at')->nullable()->after('draw_date');
            // Minutos que tiene el ganador para reclamar antes de re-sortear (null = no aplica)
            $table->unsignedSmallInteger('winner_claim_minutes')->nullable()->after('starts_at');
            // Timestamp de cuando se asignó el último ganador (para calcular el countdown de reclamación)
            $table->timestamp('winner_drawn_at')->nullable()->after('winner_claim_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            $table->dropColumn(['starts_at', 'winner_claim_minutes', 'winner_drawn_at']);
        });
    }
};
