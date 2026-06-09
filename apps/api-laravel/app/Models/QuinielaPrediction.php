<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuinielaPrediction extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'player_id',
        'match_id',
        'predicted_score_a',
        'predicted_score_b',
        'points_earned',
    ];

    public function player()
    {
        return $this->belongsTo(QuinielaPlayer::class, 'player_id');
    }

    public function match()
    {
        return $this->belongsTo(QuinielaMatch::class, 'match_id');
    }
}
