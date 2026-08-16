<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Raffle extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'status', // draft, active, completed
        'draw_date',
        'starts_at',
        'winner_claim_minutes',
        'winner_drawn_at',
    ];

    protected function casts(): array
    {
        return [
            'draw_date'             => 'datetime',
            'starts_at'             => 'datetime',
            'winner_drawn_at'       => 'datetime',
            'winner_claim_minutes'  => 'integer',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function prizes(): HasMany
    {
        return $this->hasMany(RafflePrize::class)->orderBy('position');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(RaffleParticipant::class);
    }
}
