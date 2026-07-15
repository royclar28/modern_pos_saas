#!/bin/bash
# ============================================================
# Configurar Secrets de GitHub via CLI
# ============================================================
# Requisito: gh CLI instalado y autenticado (gh auth login)
# Repo:    modern_pos_saas
# ============================================================

set -e

REPO="$(gh repo view --json nameWithOwner -q '.nameWithOwner')"

echo "🔐 Configurando secrets para: $REPO"
echo ""

# ── Coolify Backend Webhook ─────────────────────────────
gh secret set COOLIFY_BACKEND_WEBHOOK \
  --repo "$REPO" \
  --body "http://44.198.181.117:8000/api/v1/deploy?uuid=uqa1vh56j85akudl7hcuxnc8&force=false"

echo "✅ COOLIFY_BACKEND_WEBHOOK"

# ── Coolify Frontend Webhook ────────────────────────────
gh secret set COOLIFY_FRONTEND_WEBHOOK \
  --repo "$REPO" \
  --body "http://44.198.181.117:8000/api/v1/deploy?uuid=ei9w29e93f1x2s8r4z9lgbse&force=false"

echo "✅ COOLIFY_FRONTEND_WEBHOOK"

# ── WhatsApp ────────────────────────────────────────────
gh secret set VITE_SUPPORT_WHATSAPP \
  --repo "$REPO" \
  --body "584124714797"

echo "✅ VITE_SUPPORT_WHATSAPP"

echo ""
echo "🎯 Secrets configurados. Prueba el deploy:"
echo "   git push main"
