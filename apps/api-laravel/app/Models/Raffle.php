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
    ];

    protected function casts(): array
    {
        return [
            'draw_date' => 'datetime',
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
