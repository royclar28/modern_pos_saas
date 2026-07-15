<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids, HasTenant;

    public $timestamps = false; // Usa created_at manual via useCurrent()

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'entity_type',
        'entity_id',
        'action',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }
}
