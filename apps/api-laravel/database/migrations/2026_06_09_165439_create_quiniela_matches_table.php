<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiniela_matches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('team_a');
            $table->string('team_b');
            $table->timestamp('match_time');
            $table->string('status')->default('PENDING'); // PENDING, FINISHED
            $table->integer('real_score_a')->nullable();
            $table->integer('real_score_b')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiniela_matches');
    }
};
