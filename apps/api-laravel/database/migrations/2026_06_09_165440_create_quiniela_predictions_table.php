<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiniela_predictions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->constrained('quiniela_players')->cascadeOnDelete();
            $table->foreignUuid('match_id')->constrained('quiniela_matches')->cascadeOnDelete();
            $table->integer('predicted_score_a');
            $table->integer('predicted_score_b');
            $table->integer('points_earned')->default(0);
            $table->timestamps();

            $table->unique(['player_id', 'match_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiniela_predictions');
    }
};
