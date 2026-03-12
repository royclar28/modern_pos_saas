# Instrucciones para levantar Modern POS SaaS en otra PC

Este documento detalla los pasos para levantar el sistema en un entorno nuevo (como tu PC del trabajo). El proyecto está diseñado para funcionar con Docker, lo que facilita enormemente el proceso.

## Requisitos previos
- **Node.js** (v18+)
- **pnpm** (puedes instalarlo con `npm install -g pnpm`)
- **Docker** y **Docker Compose**

---

## Opción 1: Levantar todo con Docker (Recomendada)

Si Docker está correctamente configurado (y tu usuario tiene permisos o usas `sudo`), esta es la forma más directa:

1. **Clonar el proyecto** o copiar la carpeta `modern_pos_saas`.
2. **Crear el archivo de entorno**:
   - Copia `.env.example` y renómbralo a `.env`. (Ya deberías tenerlo preconfigurado en este repositorio).
   - Asegúrate de que `DATABASE_URL` apunte a `postgres` en lugar de `localhost` si todo corre en Docker:
     ```env
     DATABASE_URL="postgresql://postgres:r00t_password_segura@postgres:5432/modern_pos?schema=public"
     ```
3. **Levantar los servicios**:
   ```bash
   docker compose up -d
   ```
   *(Si tienes problemas de permisos y usas Linux, puede que debas ejecutar `sudo docker compose up -d`).*

4. **Acceder al sistema**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3333`

---

## Opción 2: Levantar localmente (Base de datos en Docker, Frontend y Backend local)

Si prefieres correr el código localmente para desarrollo (como terminamos haciendo en esta sesión por los permisos de Docker):

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Levantar la Base de Datos**:
   ```bash
   docker compose up -d postgres
   ```

3. **Configurar el archivo `.env` en la raíz**:
   Asegúrate de que la conexión a la base de datos apunte a `localhost`:
   ```env
   DATABASE_URL="postgresql://postgres:r00t_password_segura@localhost:5432/modern_pos?schema=public"
   ```

4. **Inicializar la Base de Datos (Migraciones y Seed)**:
   Aplica la estructura de las tablas y carga el usuario `admin` por defecto:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   npx prisma db seed
   cd ../..
   ```

5. **Levantar los servidores locales**:
   Abre dos terminales desde la raíz del proyecto para evitar conflictos si `turbo` falla:
   
   - **Terminal 1 (Backend - API):**
     ```bash
     pnpm --filter api run dev
     ```
   
   - **Terminal 2 (Frontend - Web):**
     ```bash
     pnpm --filter web run dev
     ```

6. **Acceder al sistema**:
   - Frontend: `http://localhost:5173` (o `5174` si el puerto estaba ocupado).
   - Credenciales por defecto:
     - **Usuario**: `admin`
     - **Contraseña**: `123456`
