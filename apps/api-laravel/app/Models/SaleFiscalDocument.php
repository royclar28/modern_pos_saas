<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleFiscalDocument extends Model
{
    use HasUuids, HasTenant;

    protected $fillable = [
        'id',
        'tenant_id',
        'sale_id',
        'document_type_id',
        'resolution_id',
        'control_number',
        'status',
        'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(FiscalDocumentType::class);
    }

    public function resolution(): BelongsTo
    {
        return $this->belongsTo(FiscalResolution::class);
    }
}
