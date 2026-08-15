<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RafflePrize extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'raffle_id',
        'name',
        'description',
        'position',
        'winner_participant_id',
    ];

    // ─── Relations ──────────────────────────────────────────────

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(RaffleParticipant::class, 'winner_participant_id');
    }
}
