<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $store = Store::create([
            'id' => Str::uuid(),
            'name' => 'Tienda Principal',
            'primary_color' => '#3B82F6',
            'is_active' => true,
        ]);

        User::create([
            'tenant_id' => $store->id,
            'username' => 'admin',
            'password' => 'password', // esto usará el cast a 'hashed' si tienes uno en el modelo, o deberías usar bcrypt()
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@ejemplo.com',
            'role' => 'SUPER_ADMIN',
        ]);
    }
}
