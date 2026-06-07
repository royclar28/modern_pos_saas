# 🏗️ Auditoría de Infraestructura, DevOps y Despliegue

**Fecha:** 2026-05-26  
**Auditor:** Sysadmin Mode  
**Proyecto:** Modern POS SaaS (MerxPOS)  
**Commit analizado:** Estado actual del workspace

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|:--------:|
| 🔴 Crítico | 3 |
| 🟠 Alto | 7 |
| 🟡 Medio | 9 |
| 🟢 Bajo | 5 |
| ✅ Correcto | 6 |

---

## 1. Docker / Contenedores

### 🔴 **CRÍTICO: El Dockerfile de Laravel usa `php:8.4-cli` (no Alpine) y `php artisan serve` en producción**

- **Archivo:** [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile)
- **Problema:** La imagen base `php:8.4-cli` pesa ~800MB (vs ~200MB de `php:8.4-cli-alpine`). Además, usa `php artisan serve` que es el servidor de desarrollo embebido de PHP — **no apto para producción** (single-threaded, sin soporte para HTTP/2, sin SSL termination).
- **Impacto:** Rendimiento pésimo en producción. `php artisan serve` procesa una solicitud a la vez. Cualquier request lenta bloquea a todas las demás.
- **Recomendación:** Usar FrankenPHP (o Swoole/Ocotber) con Alpine como base, o al menos Nginx + PHP-FPM con `php:8.4-fpm-alpine`.

### 🔴 **CRÍTICO: El Dockerfile de Laravel no tiene HEALTHCHECK**

- **Archivo:** [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile)
- **Problema:** Sin health check, Docker Compose/orquestadores no pueden determinar si el contenedor está realmente sirviendo tráfico.
- **Recomendación:** Agregar `HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8000/up || exit 1`

### 🟠 **ALTO: El Dockerfile de Laravel no tiene multi-stage build**

- **Archivo:** [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile)
- **Problema:** Las herramientas de build (Composer, git, unzip) permanecen en la imagen final, aumentando la superficie de ataque.
- **Recomendación:** Usar multi-stage: `composer:latest` como builder, copiar solo `vendor/` y el código a la imagen final.

### 🟠 **ALTO: El Dockerfile de Laravel no tiene usuario no-root**

- **Archivo:** [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile)
- **Problema:** El contenedor corre como `root`. Si un atacante compromete la app PHP, tiene acceso root dentro del contenedor.
- **Recomendación:** Agregar `RUN addgroup -S appgroup && adduser -S appuser -G appgroup` y `USER appuser`.

### 🟠 **ALTO: El entrypoint.sh del Laravel hace scaffold condicional destructivo**

- **Archivo:** [`apps/api-laravel/entrypoint.sh`](../apps/api-laravel/entrypoint.sh)
- **Problema:** Si `artisan` no existe, ejecuta `composer create-project laravel/laravel` y copia archivos con `cp -rn`. Esto es frágil: si el montaje de volumen falla parcialmente, puede crear un proyecto Laravel vacío sobreescribiendo configuración.
- **Impacto:** En producción, un reinicio del contenedor con un volumen corrupto puede regenerar todo el scaffold, perdiendo configuraciones personalizadas.
- **Recomendación:** Eliminar el scaffold condicional del entrypoint. El Dockerfile debe contener el código completo. El entrypoint solo debe ejecutar migraciones y el servidor.

### 🟡 **MEDIO: Dockerfile.dev usa `node:20-slim` sin pinning de versión de pnpm**

- **Archivo:** [`Dockerfile.dev`](../Dockerfile.dev)
- **Problema:** `pnpm@latest` instala la última versión disponible, lo que puede romper el build si hay breaking changes.
- **Recomendación:** Pinear a `pnpm@10.30.3` (la versión del `packageManager` en [`package.json`](../package.json:4)).

### 🟡 **MEDIO: docker-compose.yml no especifica versiones de imagen de PostgreSQL**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml:5)
- **Problema:** `postgres:16` usará `latest` del tag `16`, que puede cambiar con patches menores. Aunque es semver, es mejor práctica usar `postgres:16.4` o similar.
- **Recomendación:** Usar `postgres:16-alpine` para reducir tamaño y especificar un patch version.

### 🟡 **MEDIO: docker-compose.laravel.yml monta todo el código como volumen en producción**

- **Archivo:** [`docker-compose.laravel.yml`](../docker-compose.laravel.yml:9)
- **Problema:** `- ./apps/api-laravel:/app` monta el código fuente como bind mount. En producción, el código debería estar dentro de la imagen, no montado desde el host.
- **Recomendación:** Usar volúmenes solo para logs o storage, no para el código de la aplicación.

### ✅ **CORRECTO: docker-compose.yml usa restart: unless-stopped**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml:15)
- **Bien:** Política de reinicio adecuada para producción.

### ✅ **CORRECTO: Volumen nombrado para PostgreSQL**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml:14)
- **Bien:** `pos_db_data` con `name: pos_db_data_dev` asegura persistencia de datos.

---

## 2. Orquestación

### 🟠 **ALTO: No existe manifiesto Kubernetes ni Docker Swarm para producción**

- **Problema:** El sistema usa solo `docker-compose` para todo. No hay archivos YAML de Kubernetes (K3s, K8s) ni stack de Docker Swarm.
- **Impacto:** Sin auto-escalado, sin rolling updates, sin service discovery nativo, sin self-healing de pods. Para un sistema SaaS multi-tenant, esto es insuficiente.
- **Recomendación:** Crear manifiestos para K3s (ligero, ideal para on-premise) con Deployments, Services, Ingress, ConfigMaps, Secrets y PersistentVolumeClaims.

### 🟡 **MEDIO: Los servicios están en dos archivos docker-compose separados**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml), [`docker-compose.laravel.yml`](../docker-compose.laravel.yml)
- **Problema:** El backend Laravel y el frontend+DB están en archivos separados. No comparten la misma red Docker por defecto.
- **Recomendación:** Unificar en un solo `docker-compose.yml` con una network compartida, o al menos documentar que deben estar en la misma network.

---

## 3. CI/CD

### 🔴 **CRÍTICO: Solo existe 1 workflow de GitHub Actions y solo build para Windows**

- **Archivo:** [`.github/workflows/build-windows.yml`](../.github/workflows/build-windows.yml)
- **Problema:** 
  - No hay pipeline de CI para el backend Laravel (PHPUnit, Pint, Stan)
  - No hay pipeline de CI para el frontend (Vitest, ESLint, TypeScript check)
  - No hay pipeline de CI para el backend NestJS
  - No hay deploy automático a ningún entorno
  - No hay análisis de seguridad (Dependency scanning, SAST)
  - No hay build de imágenes Docker
- **Impacto:** Cualquier cambio que rompa tests o introduzca vulnerabilidades llega a `main` sin barreras.
- **Recomendación:** Implementar pipelines completos:
  1. **CI Laravel:** `composer install` → `php artisan test` → `phpstan analyse`
  2. **CI Frontend:** `pnpm install` → `pnpm lint` → `pnpm build` → `vitest run`
  3. **CI NestJS:** `pnpm install` → `pnpm build` → `jest`
  4. **Docker Build:** Build y push de imágenes a GHCR o Docker Hub
  5. **Deploy:** CD a staging/producción vía SSH o Kubernetes

### 🟠 **ALTO: El workflow de Windows no firma el instalador**

- **Archivo:** [`.github/workflows/build-windows.yml`](../.github/workflows/build-windows.yml)
- **Problema:** El MSI generado no está firmado digitalmente. Windows SmartScreen bloqueará la instalación con advertencia de "editor no verificado".
- **Recomendación:** Usar Azure Key Vault + `tauri-action` con `certificateThumbprint` para firmar el binario.

### 🟡 **MEDIO: El workflow usa `tauri-apps/tauri-action@v0` (versión 0.x)**

- **Archivo:** [`.github/workflows/build-windows.yml`](../.github/workflows/build-windows.yml:32)
- **Problema:** `v0` puede tener bugs o estar deprecado. La acción oficial de Tauri 2.x es `tauri-apps/tauri-action@v2`.
- **Recomendación:** Actualizar a `tauri-apps/tauri-action@v2`.

### 🟡 **MEDIO: El release usa `tag_name: latest` fijo**

- **Archivo:** [`.github/workflows/build-windows.yml`](../.github/workflows/build-windows.yml:47)
- **Problema:** Siempre etiqueta como `latest`, sobreescribiendo releases anteriores. No hay versionado semántico.
- **Recomendación:** Usar `tag_name: v${{ github.run_number }}` o extraer versión de `package.json`.

---

## 4. PM2

### 🟡 **MEDIO: PM2 configurado para NestJS pero el proyecto migró a Laravel**

- **Archivo:** [`ecosystem.config.js`](../ecosystem.config.js)
- **Problema:** PM2 está configurado para ejecutar `pnpm run dev` en `./apps/api` (NestJS). Pero el README indica que el backend principal ahora es Laravel. NestJS parece ser un backend legacy o secundario.
- **Impacto:** Confusión sobre cuál backend está activo. Si Laravel es el principal, PM2 debería apuntar a Laravel o no usarse (Laravel ya corre en Docker).
- **Recomendación:** Decidir si PM2 es para desarrollo local (sin Docker) o legacy. Documentar claramente.

### 🟢 **BAJO: watch: false y max_memory_restart correctos**

- **Archivo:** [`ecosystem.config.js`](../ecosystem.config.js:11-12)
- **Bien:** `watch: false` evita reinicios infinitos. `max_memory_restart: '1G'` es un límite razonable.

---

## 5. Secretos y Seguridad de Infraestructura

### 🔴 **CRÍTICO: Clave SSH privada (.pem) en el repositorio**

- **Archivo:** [`LightsailDefaultKey-us-east-1.pem`](../LightsailDefaultKey-us-east-1.pem)
- **Problema:** Una clave privada SSH de AWS Lightsail está en el repositorio. Cualquier persona con acceso al repo puede usarla para conectarse a instancias de AWS.
- **Impacto:** **Compromiso total de las instancias de AWS Lightsail.** Un atacante puede obtener acceso SSH a servidores de producción.
- **Acción inmediata:**
  1. Rotar/revocar esta clave en AWS Lightsail inmediatamente.
  2. Agregar `*.pem` al [`.gitignore`](../.gitignore).
  3. Eliminar el archivo del historial de git con `git filter-branch` o `bfg-repo-cleaner`.
  4. Usar AWS Secrets Manager o GitHub Secrets para almacenar claves SSH.

### 🟠 **ALTO: .env.example contiene contraseñas hardcodeadas**

- **Archivo:** [`.env.example`](../.env.example)
- **Problema:** `DB_PASSWORD=r00t_password_segura` y `JWT_SECRET="mi_secreto_super_seguro_para_jwt_dev_123"` son valores de ejemplo que podrían filtrarse a producción si alguien copia el `.env.example` sin cambiarlos.
- **Recomendación:** Usar placeholders como `DB_PASSWORD=changeme` y `JWT_SECRET=changeme`.

### 🟢 **BAJO: .gitignore incluye .env correctamente**

- **Archivo:** [`.gitignore`](../.gitignore:6)
- **Bien:** `.env` está en `.gitignore`, lo que evita que variables de entorno reales se suban al repositorio.

### 🟢 **BAJO: .gitignore no incluye *.pem**

- **Archivo:** [`.gitignore`](../.gitignore)
- **Problema:** No hay regla para `*.pem`, `*.key`, o `certificates/`. Esto permitió que la clave `.pem` se subiera.
- **Recomendación:** Agregar `*.pem`, `*.key`, `certs/`, `secrets/` al `.gitignore`.

---

## 6. Monitoreo, Logging y Health Checks

### 🟠 **ALTO: No hay sistema de monitoreo ni alertas**

- **Problema:** No se encontró configuración de Prometheus, Grafana, Sentry, Datadog, New Relic, ni ninguna herramienta de APM/monitoreo.
- **Impacto:** No hay visibilidad de:
  - Rendimiento de la API (latencia, throughput)
  - Uso de recursos (CPU, RAM, disco)
  - Errores 500, excepciones no capturadas
  - Tasa de sincronización offline
- **Recomendación:** Implementar al menos:
  - **Sentry** para errores en backend y frontend
  - **Prometheus + Grafana** para métricas de infraestructura
  - **Health endpoints** con respuesta detallada (DB status, queue status, sync health)

### 🟡 **MEDIO: Laravel tiene health endpoint `/up` pero no se usa en Docker**

- **Archivo:** [`apps/api-laravel/bootstrap/app.php`](../apps/api-laravel/bootstrap/app.php:12)
- **Problema:** Laravel 11+ tiene un health endpoint `/up` integrado, pero ningún HEALTHCHECK de Docker lo utiliza.
- **Recomendación:** Agregar `HEALTHCHECK CMD curl -f http://localhost:8000/up` en el Dockerfile de Laravel.

### 🟡 **MEDIO: Logging configurado como `single` (archivo único)**

- **Archivo:** [`apps/api-laravel/config/logging.php`](../apps/api-laravel/config/logging.php:61-66)
- **Problema:** El canal `single` escribe todo en un solo archivo `laravel.log`. En producción, esto crece indefinidamente hasta llenar el disco.
- **Recomendación:** Usar `daily` (rotación diaria con retención de 14 días) o `stderr` (para Docker, mejor enviar a stdout/stderr y dejar que el orquestador maneje los logs).

### 🟢 **BAJO: Logging tiene canal `stderr` configurado**

- **Archivo:** [`apps/api-laravel/config/logging.php`](../apps/api-laravel/config/logging.php:97-106)
- **Bien:** El canal `stderr` está disponible y es el recomendado para entornos Dockerizados.
- **Recomendación:** Cambiar `LOG_CHANNEL` a `stderr` en producción.

### ✅ **CORRECTO: Laravel tiene health endpoint nativo**

- **Archivo:** [`apps/api-laravel/bootstrap/app.php`](../apps/api-laravel/bootstrap/app.php:12)
- **Bien:** Laravel 11+ incluye `health: '/up'` que Laravel utiliza para health checks de load balancers.

---

## 7. Networking y TLS

### 🟠 **ALTO: No hay reverse proxy ni TLS configurado**

- **Problema:** Los servicios se exponen directamente en puertos host sin TLS:
  - Laravel: `8001:8000` (HTTP plano)
  - Frontend: `5174:5173` (HTTP plano, solo dev)
  - PostgreSQL: `5434:5432` (sin autenticación fuerte)
- **Impacto:** Todo el tráfico viaja en texto plano. Credenciales, tokens JWT y datos de ventas son interceptables en la red.
- **Recomendación:** Implementar:
  - **Caddy** o **Traefik** como reverse proxy con TLS automático (Let's Encrypt)
  - Red interna de Docker para comunicación entre servicios
  - Exponer solo puerto 443 (HTTPS) al exterior

### 🟡 **MEDIO: PostgreSQL expuesto al host en puerto no estándar**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml:11-12)
- **Problema:** `5434:5432` expone PostgreSQL al host. Aunque el puerto no es el default, sigue siendo un vector de ataque.
- **Recomendación:** En producción, no exponer PostgreSQL al host. Solo los servicios internos deben acceder a la DB.

### ✅ **CORRECTO: CORS configurado correctamente para múltiples orígenes**

- **Archivo:** [`apps/api-laravel/config/cors.php`](../apps/api-laravel/config/cors.php:22)
- **Bien:** `allowed_origins` incluye localhost, 127.0.0.1, y orígenes Tauri. `supports_credentials: true` es correcto para Sanctum.

---

## 8. Build de Frontend (Vite, PWA, Tauri)

### 🟡 **MEDIO: Vite configurado con `host: true` en producción**

- **Archivo:** [`apps/web/vite.config.ts`](../apps/web/vite.config.ts:86-88)
- **Problema:** `host: true` expone el servidor de Vite a todas las interfaces de red. Esto es correcto para desarrollo en Docker, pero si se usa en producción, expone el dev server.
- **Recomendación:** Asegurar que `host: true` solo se active en desarrollo (usar `server.host` condicional).

### 🟡 **MEDIO: PWA no tiene service worker personalizado para offline**

- **Archivo:** [`apps/web/vite.config.ts`](../apps/web/vite.config.ts:9-77)
- **Problema:** `vite-plugin-pwa` usa Workbox con `globPatterns` genéricos. No hay estrategia de caché para las llamadas API (sync endpoints). El runtime caching solo cubre Google Fonts.
- **Impacto:** La app no funciona offline para las operaciones que requieren datos del servidor (aunque RxDB maneja el almacenamiento local).
- **Recomendación:** Agregar runtime caching para las rutas de API de sincronización con estrategia `NetworkFirst` o `StaleWhileRevalidate`.

### 🟢 **BAJO: Tauri `csp: null` desactiva la política de seguridad de contenido**

- **Archivo:** [`apps/web/src-tauri/tauri.conf.json`](../apps/web/src-tauri/tauri.conf.json:24-25)
- **Problema:** `"csp": null` desactiva completamente CSP. Esto permite ejecución de scripts arbitrarios.
- **Recomendación:** Configurar una CSP restrictiva, ej: `"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"`
- **Nota:** En Tauri 2.x, CSP null es común durante desarrollo, pero debe configurarse para producción.

### ✅ **CORRECTO: Tauri capabilities con permisos mínimos**

- **Archivo:** [`apps/web/src-tauri/capabilities/default.json`](../apps/web/src-tauri/capabilities/default.json)
- **Bien:** Solo `core:default` está habilitado. No hay permisos innecesarios (shell, fs, etc.).

### ✅ **CORRECTO: PWA configurada con `registerType: 'prompt'`**

- **Archivo:** [`apps/web/vite.config.ts`](../apps/web/vite.config.ts:10)
- **Bien:** Usa `prompt` en lugar de `autoUpdate`, dando control al usuario sobre las actualizaciones.

---

## 9. Monorepo y Scripts

### 🟡 **MEDIO: `turbo` y `typescript` en `latest` en package.json raíz**

- **Archivo:** [`package.json`](../package.json:13-14)
- **Problema:** `"turbo": "latest"` y `"typescript": "latest"` no pinean versiones. Breaking changes pueden romper el build.
- **Recomendación:** Pinear a versiones específicas (ej: `"turbo": "^2.5.0"`).

### 🟡 **MEDIO: No existe `turbo.json`**

- **Problema:** El `package.json` raíz referencia `turbo run dev` y `turbo run build`, pero no hay archivo [`turbo.json`](../turbo.json) (no encontrado). Turborepo necesita `turbo.json` para definir pipelines, caché y dependencias entre tareas.
- **Impacto:** `turbo run` puede fallar o comportarse inesperadamente sin configuración.
- **Recomendación:** Crear [`turbo.json`](../turbo.json) con pipelines para `build`, `dev`, `lint` y `test`.

### ✅ **CORRECTO: pnpm-workspace.yaml bien configurado**

- **Archivo:** [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)
- **Bien:** `apps/*` y `packages/*` cubren todos los workspaces. `onlyBuiltDependencies` lista correctamente las dependencias que necesitan compilación nativa.

### ✅ **CORRECTO: packageManager pinneado en pnpm@10.30.3**

- **Archivo:** [`package.json`](../package.json:4)
- **Bien:** La versión de pnpm está fijada, lo que asegura consistencia entre entornos.

---

## 10. Backup y Recuperación

### 🟠 **ALTO: No hay estrategia de backup documentada ni configurada**

- **Problema:** No se encontró:
  - Script de backup de PostgreSQL
  - Configuración de backup automático (cron, pg_dump)
  - Estrategia de retention
  - Procedimiento de restauración documentado
- **Impacto:** Si la base de datos se corrompe o el volumen Docker se pierde, todos los datos del negocio (ventas, clientes, configuraciones) se pierden permanentemente.
- **Recomendación:**
  1. Crear script de backup: `pg_dump -h localhost -U postgres modern_pos > /backups/pos_$(date +%Y%m%d_%H%M%S).sql`
  2. Programar cron diario
  3. Almacenar backups en ubicación remota (S3, SFTP)
  4. Documentar procedimiento de restauración
  5. Probar restauración periódicamente

### 🟢 **BAJO: Volumen de PostgreSQL es persistente**

- **Archivo:** [`docker-compose.yml`](../docker-compose.yml:14)
- **Bien:** El volumen `pos_db_data` asegura que los datos sobreviven a reinicios de contenedor.

---

## 11. Documentación de Infraestructura

### ✅ **CORRECTO: README.md es completo y detallado**

- **Archivo:** [`README.md`](../README.md)
- **Bien:** Cubre arquitectura, setup, rutas, roles, tecnologías. Es el estándar de documentación del proyecto.

### 🟡 **MEDIO: COMO_LEVANTAR_AQUI.md contiene contraseña del usuario**

- **Archivo:** [`COMO_LEVANTAR_AQUI.md`](../COMO_LEVANTAR_AQUI.md:13)
- **Problema:** La contraseña del usuario (`Caracas$5`) está escrita en texto plano en el documento.
- **Recomendación:** Reemplazar con `[TU_CONTRASEÑA_SUDO]` o usar `sudo -k` para que pida la contraseña cada vez.

### 🟢 **BAJO: No hay documentación de despliegue en producción**

- **Problema:** No hay `DEPLOY.md`, `PRODUCTION.md` o similar que documente:
  - Requisitos de hardware para on-premise
  - Pasos de despliegue en servidor real
  - Configuración de Nginx/Caddy como reverse proxy
  - Variables de entorno requeridas en producción
  - Procedimiento de actualización (zero-downtime?)
- **Recomendación:** Crear documentación de producción separada.

---

## 12. Hallazgos Adicionales

### 🟠 **ALTO: NestJS (apps/api) parece legacy pero sigue en el monorepo**

- **Archivo:** [`apps/api/package.json`](../apps/api/package.json)
- **Problema:** El proyecto tiene dos backends: Laravel (principal) y NestJS (legacy?). NestJS usa Prisma con MySQL (`mysql2`), mientras Laravel usa PostgreSQL. Esto duplica la lógica de negocio y la superficie de mantenimiento.
- **Impacto:** Confusión sobre cuál es el backend activo. Posible inconsistencia de datos si ambos están operando.
- **Recomendación:** Decidir y documentar: si Laravel es el único backend activo, eliminar o archivar `apps/api/`.

### 🟡 **MEDIO: No hay scripts de deploy.sh (mencionado en README pero no existe)**

- **Archivo:** [`README.md`](../README.md:180)
- **Problema:** El README menciona `deploy.sh` pero no existe en el repositorio.
- **Recomendación:** Crear el script o eliminar la referencia del README.

### 🟢 **BAJO: scratch.sh es un script huérfano**

- **Archivo:** [`scratch.sh`](../scratch.sh)
- **Problema:** Script que busca archivos PHP en un path que no existe (`/home/royclar/Documents/parking-saas/app`). Parece ser un resto de una sesión anterior.
- **Recomendación:** Eliminar o mover a `scripts/archive/`.

---

## Resumen de Acciones Prioritarias

| # | Acción | Severidad | Archivo(s) |
|---|--------|-----------|------------|
| 1 | **Rotar clave SSH .pem y eliminar del repo** | 🔴 Crítico | [`LightsailDefaultKey-us-east-1.pem`](../LightsailDefaultKey-us-east-1.pem) |
| 2 | **Reemplazar `php artisan serve` por FrankenPHP/Nginx+FPM** | 🔴 Crítico | [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile) |
| 3 | **Implementar pipelines CI/CD completos** | 🔴 Crítico | [`.github/workflows/`](../.github/workflows/) |
| 4 | **Agregar HEALTHCHECK a Dockerfiles** | 🟠 Alto | [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile) |
| 5 | **Agregar usuario no-root en Dockerfiles** | 🟠 Alto | [`apps/api-laravel/Dockerfile`](../apps/api-laravel/Dockerfile) |
| 6 | **Implementar reverse proxy con TLS (Caddy/Traefik)** | 🟠 Alto | Nuevo archivo |
| 7 | **Implementar estrategia de backup de BD** | 🟠 Alto | Nuevo script |
| 8 | **Eliminar scaffold condicional del entrypoint** | 🟠 Alto | [`apps/api-laravel/entrypoint.sh`](../apps/api-laravel/entrypoint.sh) |
| 9 | **Implementar monitoreo (Sentry + Prometheus/Grafana)** | 🟠 Alto | Nuevos archivos |
| 10 | **Agregar `*.pem` al .gitignore** | 🟢 Bajo | [`.gitignore`](../.gitignore) |

---

*Reporte generado el 2026-05-26 por Sysadmin Audit Mode*
