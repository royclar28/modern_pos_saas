# Deploy Automático a Coolify — MERX POS

## Flujo CI/CD

```
git push main → GitHub Actions → Build + Test → Coolify Webhooks → Deploy
                                                       │
                                     ┌─────────────────┴─────────────────┐
                                     ▼                                   ▼
                              Backend (Laravel)                  Frontend (React)
                              apps/api-laravel/                  apps/web/
```

---

## 1. Workflow en Producción

Archivo: `.github/workflows/deploy-production.yml`

```yaml
name: CI/CD — Build, Test & Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:  # ejecución manual desde GitHub

jobs:
  build-and-deploy:
    steps:
      # 1. Backend: composer validate + install
      # 2. Frontend: pnpm install + pnpm build
      # 3. Trigger Coolify Deployments (solo en main + success)
      - name: Trigger Coolify Deployments
        if: github.ref == 'refs/heads/main' && success()
        run: |
          curl -X GET "${{ secrets.COOLIFY_BACKEND_WEBHOOK }}"
          curl -X GET "${{ secrets.COOLIFY_FRONTEND_WEBHOOK }}"
```

## 2. Configurar Secrets en GitHub

**Settings → Secrets and variables → Actions → Repository secrets**

| Secret | Dónde obtenerlo |
|---|---|
| `COOLIFY_BACKEND_WEBHOOK` | Coolify Dashboard → Proyecto Backend → Webhooks → Copiar URL (GET) |
| `COOLIFY_FRONTEND_WEBHOOK` | Coolify Dashboard → Proyecto Frontend → Webhooks → Copiar URL (GET) |
| `VITE_SUPPORT_WHATSAPP` | Tu número de WhatsApp (formato: 584241234567) |

## 3. Dónde Encontrar los Webhooks en Coolify

1. Entra a tu dashboard de Coolify
2. Ve al proyecto del **Backend** (Laravel)
3. Sidebar → **Webhooks** o **Deploy Keys**
4. Copia la URL del webhook (debe ser un GET)
5. Repite para el proyecto del **Frontend**

La URL típica de Coolify es:
```
https://coolify.io/api/v1/deploy?uuid=abc123-def456&force=false
```

## 4. ¿Qué pasa en cada push a `main`?

```
git push main
  │
  ▼
GitHub Actions se ejecuta
  │
  ├── PHP 8.4 setup → composer validate → composer install  ✅
  │
  ├── Node 22 setup → pnpm install → pnpm build             ✅
  │
  └── if: github.ref == 'refs/heads/main' && success()
        │
        ├── curl -X GET $COOLIFY_BACKEND_WEBHOOK   → Backend redeploy
        └── curl -X GET $COOLIFY_FRONTEND_WEBHOOK  → Frontend redeploy
```

## 5. ¿Qué pasa en un PR o push a otra rama?

El workflow `.github/workflows/ci.yml` se ejecuta pero **sin disparar el deploy**:
- Composer validate
- pnpm build de prueba
- TypeScript check

No se modifican los entornos de producción hasta que el código llega a `main`.
