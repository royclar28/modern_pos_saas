<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SyncEventProcessorTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $store;
    protected $cashierUser;

    /**
     * Configuración del Test (Setup)
     */
    protected function setUp(): void
    {
        parent::setUp();

        // 1. Crear un Store (Tenant) de prueba
        $this->store = Store::create([
            'id' => Str::uuid()->toString(),
            'name' => 'Test Store',
            'is_active' => true,
        ]);

        // 2. Crear un usuario cajero autenticado asociado a este Tenant
        $this->cashierUser = User::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $this->store->id,
            'first_name' => 'Cashier',
            'last_name' => 'User',
            'username' => 'cashier',
            'email' => 'cashier@test.com',
            'password' => bcrypt('password'),
            'role' => 'CASHIER', // O el rol correspondiente que se use en el sistema
        ]);
    }

    /**
     * Test 1: Idempotencia en el procesamiento de eventos.
     * Un mismo evento enviado 2 veces debe procesarse solo una vez.
     */
    public function test_sync_events_processor_is_idempotent()
    {
        Sanctum::actingAs($this->cashierUser);

        $eventId  = Str::uuid()->toString();
        $clientId = Str::uuid()->toString();

        $payload = [
            'events' => [
                [
                    'event_id'    => $eventId,
                    'tenant_id'   => $this->store->id,
                    'entity_type' => 'CUSTOMER',
                    'action'      => 'CREATE',
                    'entity_id'   => $clientId,
                    'occurred_at' => now()->toIso8601String(),
                    'payload'     => [
                        'id'         => $clientId,
                        'tenant_id'  => $this->store->id,
                        'first_name' => 'Cliente',
                        'last_name'  => 'Idempotencia',
                        'email'      => 'idempotent@test.com',
                        'phone'      => '+584140000000',
                    ],
                ]
            ]
        ];

        // Primera petición: El evento se inserta en base de datos
        $response1 = $this->postJson('/api/sync/events', $payload);
        $response1->assertStatus(200);

        // Verificamos que se haya procesado el cliente
        $this->assertDatabaseHas('customers', [
            'id'         => $clientId,
            'first_name' => 'Cliente',
            'last_name'  => 'Idempotencia',
            'email'      => 'idempotent@test.com',
            'tenant_id'  => $this->store->id,
        ]);

        $this->assertDatabaseCount('customers', 1);

        // Segunda petición: Simulamos un retry de la red (Idempotencia)
        $response2 = $this->postJson('/api/sync/events', $payload);

        // Debe devolver 200 OK para que la app cliente elimine el evento del Outbox local
        $response2->assertStatus(200);

        // Sin embargo, NO debe haber registros duplicados en la base de datos
        $this->assertDatabaseCount('customers', 1);
    }

    /**
     * Test 2: Aislamiento Multi-Tenant estricto.
     * Un usuario de un Tenant NO puede sincronizar/inyectar datos hacia otro Tenant.
     */
    public function test_sync_events_processor_enforces_tenant_isolation()
    {
        Sanctum::actingAs($this->cashierUser);

        $otherStore = Store::create([
            'id' => Str::uuid()->toString(),
            'name' => 'Other Store',
            'is_active' => true,
        ]);
        $attackerId = Str::uuid()->toString();
        $eventId    = Str::uuid()->toString();

        $payload = [
            'events' => [
                [
                    'event_id'    => $eventId,
                    'tenant_id'   => $otherStore->id, // Intento de inyección cruzada de tenant
                    'entity_type' => 'CUSTOMER',
                    'action'      => 'CREATE',
                    'entity_id'   => $attackerId,
                    'occurred_at' => now()->toIso8601String(),
                    'payload'     => [
                        'id'         => $attackerId,
                        'tenant_id'  => $otherStore->id,
                        'first_name' => 'Cliente',
                        'last_name'  => 'Hackeado',
                        'email'      => 'hacker@evil.test',
                        'phone'      => '+10000000000',
                    ],
                ]
            ]
        ];

        // El SyncController responde 200 para no romper la cola del cliente,
        // pero el TenantScope silencia la escritura en el tenant ajeno.
        $response = $this->postJson('/api/sync/events', $payload);
        $response->assertStatus(200);

        // La garantía real: el dato se guardó en el tenant del cajero autenticado,
        // NUNCA en el tenant ajeno que el atacante intentó inyectar.
        $this->assertDatabaseMissing('customers', [
            'first_name' => 'Cliente',
            'last_name'  => 'Hackeado',
            'tenant_id'  => $otherStore->id, // Aquí es donde NO debe estar
        ]);

        // Y de hecho sí se guardó en el tenant correcto del usuario autenticado
        $this->assertDatabaseHas('customers', [
            'first_name' => 'Cliente',
            'last_name'  => 'Hackeado',
            'tenant_id'  => $this->store->id, // El TenantScope redirige siempre al tenant real
        ]);
    }

    /**
     * Test 3: Procesamiento Atómico de Creación Offline.
     * Un evento CREATE de Customer debe insertar los datos correctos en el backend.
     */
    public function test_sync_events_processor_successfully_creates_offline_customer()
    {
        Sanctum::actingAs($this->cashierUser);

        $eventId = Str::uuid()->toString();
        $customerId = Str::uuid()->toString();

        $payload = [
            'events' => [
                [
                    'event_id'    => $eventId,
                    'tenant_id'   => $this->store->id,
                    'entity_type' => 'CUSTOMER',
                    'action'      => 'CREATE',
                    'entity_id'   => $customerId,
                    'occurred_at' => now()->subMinutes(5)->toIso8601String(), // Creado offline hace 5 min
                    'payload'     => [
                        'id'         => $customerId,
                        'tenant_id'  => $this->store->id,
                        'first_name' => 'María',
                        'last_name'  => 'García',
                        'email'      => 'maria@offline.test',
                        'phone'      => '+584140000000',
                    ],
                ]
            ]
        ];

        // Enviamos el batch offline
        $response = $this->postJson('/api/sync/events', $payload);
        $response->assertStatus(200);

        // Confirmamos que el motor persistó atómicamente todos los campos
        $this->assertDatabaseHas('customers', [
            'id'         => $customerId,
            'first_name' => 'María',
            'last_name'  => 'García',
            'email'      => 'maria@offline.test',
            'tenant_id'  => $this->store->id,
        ]);
    }
}
