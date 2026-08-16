<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
    ];
}
