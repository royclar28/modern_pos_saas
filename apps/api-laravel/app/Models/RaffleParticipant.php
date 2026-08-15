<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RaffleParticipant extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'raffle_id',
        'name',
        'phone',
    ];

    // ─── Relations ──────────────────────────────────────────────

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }
}
