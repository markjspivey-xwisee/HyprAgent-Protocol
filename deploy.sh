#!/usr/bin/env bash
set -euo pipefail

# ============================================
# HyprCAT Platform - Deployment Script
# ============================================
# Usage:
#   ./deploy.sh local        # Docker Compose (default)
#   ./deploy.sh fly          # Deploy to Fly.io
#   ./deploy.sh railway      # Deploy to Railway
#   ./deploy.sh dev          # Local dev (no Docker)

COMMAND="${1:-local}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║         HyprCAT Platform Deployer                   ║"
  echo "║  Hypermedia Context & Action Transfer Protocol       ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

check_deps() {
  local missing=()
  for cmd in "$@"; do
    if ! command -v "$cmd" &> /dev/null; then
      missing+=("$cmd")
    fi
  done
  if [ ${#missing[@]} -ne 0 ]; then
    echo -e "${YELLOW}Missing dependencies: ${missing[*]}${NC}"
    exit 1
  fi
}

# --- Local Docker Compose ---
deploy_local() {
  echo -e "${GREEN}Deploying with Docker Compose...${NC}"
  check_deps docker

  # Create .env from example if it doesn't exist
  if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Edit .env to set JWT_SECRET before production use!${NC}"
  fi

  docker compose -f docker/docker-compose.yml build
  docker compose -f docker/docker-compose.yml up -d

  echo ""
  echo -e "${GREEN}HyprCAT is running!${NC}"
  echo -e "  Web UI:     http://localhost:${WEB_PORT:-80}"
  echo -e "  Gateway:    http://localhost:${SERVER_PORT:-3001}"
  echo -e "  Health:     http://localhost:${SERVER_PORT:-3001}/health"
  echo -e "  Catalog:    http://localhost:${SERVER_PORT:-3001}/catalog"
  echo ""
  echo "Logs:  docker compose -f docker/docker-compose.yml logs -f"
  echo "Stop:  docker compose -f docker/docker-compose.yml down"
}

# --- Fly.io ---
deploy_fly() {
  echo -e "${GREEN}Deploying to Fly.io...${NC}"
  check_deps fly

  # Check if app exists
  if ! fly apps list 2>/dev/null | grep -q hyprcat-gateway; then
    echo -e "${YELLOW}Creating Fly.io app...${NC}"
    fly launch --copy-config --no-deploy

    # Create persistent volume
    echo -e "${YELLOW}Creating persistent volume...${NC}"
    fly volumes create hyprcat_data --size 1 --region iad

    # Set secrets
    echo -e "${YELLOW}Set your JWT secret:${NC}"
    fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
  fi

  fly deploy

  echo ""
  echo -e "${GREEN}Deployed to Fly.io!${NC}"
  fly status
}

# --- Railway ---
deploy_railway() {
  echo -e "${GREEN}Deploying to Railway...${NC}"
  check_deps railway

  echo "Railway reads railway.toml from your repo."
  echo ""
  echo "Steps:"
  echo "  1. Push this repo to GitHub"
  echo "  2. Go to https://railway.app/new"
  echo "  3. Select 'Deploy from GitHub repo'"
  echo "  4. Add environment variables in the dashboard:"
  echo "     - JWT_SECRET (generate with: openssl rand -hex 32)"
  echo "     - BASE_URL (your Railway URL, e.g. https://hyprcat-gateway.up.railway.app)"
  echo "     - CORS_ORIGINS (your frontend URL)"
  echo ""
  echo "Railway will auto-detect railway.toml and use Dockerfile.server."
}

# --- Local Dev (no Docker) ---
deploy_dev() {
  echo -e "${GREEN}Starting local development...${NC}"
  check_deps node pnpm

  if [ ! -f .env ]; then
    cp .env.example .env
  fi

  # Install and build
  pnpm install
  pnpm build:all

  echo ""
  echo -e "${GREEN}Starting dev servers...${NC}"
  echo "  Frontend: http://localhost:3000"
  echo "  Gateway:  http://localhost:3001"
  echo ""

  pnpm dev:all
}

# --- Main ---
banner

case "$COMMAND" in
  local|docker)
    deploy_local
    ;;
  fly|flyio)
    deploy_fly
    ;;
  railway)
    deploy_railway
    ;;
  dev|development)
    deploy_dev
    ;;
  stop)
    docker compose -f docker/docker-compose.yml down
    echo -e "${GREEN}Stopped.${NC}"
    ;;
  *)
    echo "Usage: ./deploy.sh [local|fly|railway|dev|stop]"
    echo ""
    echo "  local     Docker Compose on this machine (default)"
    echo "  fly       Deploy to Fly.io"
    echo "  railway   Deploy to Railway"
    echo "  dev       Local dev without Docker (pnpm dev:all)"
    echo "  stop      Stop Docker Compose services"
    exit 1
    ;;
esac
