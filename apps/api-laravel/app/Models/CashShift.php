<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * CashShift — Turno de Caja.
 *
 * Representa un período de operación del cajero.
 * Un cajero abre turno con fondo inicial,
 * y al cerrar declara el conteo físico. El sistema
 * calcula el expected_cash y la diferencia (descuadre).
 *
 * @property string  $id
 * @property string  $tenant_id
 * @property string  $user_id
 * @property string  $terminal_id
 * @property string  $opened_at
 * @property ?string $closed_at
 * @property float   $starting_cash
 * @property float   $expected_cash
 * @property ?float  $actual_cash
 * @property ?float  $difference
 * @property string  $status          OPEN|CLOSED
 * @property ?array  $sales_summary
 */
class CashShift extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'cash_shifts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'terminal_id',
        'opened_at',
        'closed_at',
        'starting_cash',
        'expected_cash',
        'actual_cash',
        'difference',
        'status',
        'sales_summary',
    ];

    protected $casts = [
        'starting_cash' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'actual_cash'   => 'decimal:2',
        'difference'    => 'decimal:2',
        'opened_at'     => 'datetime',
        'closed_at'     => 'datetime',
        'sales_summary' => 'array',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);
    }

    // ── Relationships ────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ── Helpers ──────────────────────────────────────

    public function isOpen(): bool
    {
        return $this->status === 'OPEN';
    }

    public function close(float $actualCash, float $expectedCash, ?array $salesSummary = null): void
    {
        $this->update([
            'closed_at'     => now(),
            'actual_cash'   => $actualCash,
            'expected_cash' => $expectedCash,
            'difference'    => $actualCash - $expectedCash,
            'status'        => 'CLOSED',
            'sales_summary' => $salesSummary,
        ]);
    }
}
