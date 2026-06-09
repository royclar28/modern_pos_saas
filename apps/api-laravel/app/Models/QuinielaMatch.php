<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuinielaMatch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'team_a',
        'team_b',
        'match_time',
        'status',
        'real_score_a',
        'real_score_b',
    ];

    protected $casts = [
        'match_time' => 'datetime',
    ];

    public function predictions()
    {
        return $this->hasMany(QuinielaPrediction::class, 'match_id');
    }
}
