<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalResolution extends Model
{
    use HasUuids, HasTenant;

    protected $fillable = [
        'id',
        'tenant_id',
        'document_type_id',
        'prefix',
        'from_number',
        'to_number',
        'current_number',
        'resolution_date',
        'resolution_number',
        'is_active',
    ];

    protected $casts = [
        'from_number' => 'integer',
        'to_number' => 'integer',
        'current_number' => 'integer',
        'resolution_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(FiscalDocumentType::class);
    }
}
