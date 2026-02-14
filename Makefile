# ============================================
# Mentory Makefile
# ============================================
# Usage: make <command>

.PHONY: help dev dev-full down logs clean reset-db migrate seed build test lint format start start-dev start-prod

# Default
.DEFAULT_GOAL := help

# Variables
COMPOSE_DEV := docker compose -f infra/docker-compose.dev.yml
COMPOSE_PROD := docker compose -f infra/docker-compose.prod.yml

# Colors
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

# ============================================
# Help
# ============================================
help: ## Show this help
	@echo ""
	@echo "$(CYAN)Mentory Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================
# Development
# ============================================
dev: ## Start dev environment (db, redis, minio, api, web)
	@echo "$(CYAN)Starting development environment...$(NC)"
	$(COMPOSE_DEV) up --build

dev-full: ## Start dev with all services including mailhog
	@echo "$(CYAN)Starting full development environment...$(NC)"
	$(COMPOSE_DEV) --profile mail up --build

dev-d: ## Start dev environment (detached)
	@echo "$(CYAN)Starting development environment (detached)...$(NC)"
	$(COMPOSE_DEV) up --build -d

down: ## Stop all containers
	@echo "$(YELLOW)Stopping containers...$(NC)"
	$(COMPOSE_DEV) down

down-v: ## Stop all containers and remove volumes
	@echo "$(YELLOW)Stopping containers and removing volumes...$(NC)"
	$(COMPOSE_DEV) down -v

logs: ## Tail logs from all containers
	$(COMPOSE_DEV) logs -f

logs-api: ## Tail API logs
	$(COMPOSE_DEV) logs -f api

logs-web: ## Tail Web logs
	$(COMPOSE_DEV) logs -f web

# ============================================
# Database Commands (Prisma)
# ============================================
reset-db: ## Reset database (drop & recreate + migrate + seed)
	@echo "$(YELLOW)Resetting database...$(NC)"
	$(COMPOSE_DEV) exec db psql -U mentory -c "DROP DATABASE IF EXISTS mentory;"
	$(COMPOSE_DEV) exec db psql -U mentory -c "CREATE DATABASE mentory;"
	@echo "$(CYAN)Running migrations...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api prisma:migrate:deploy
	@echo "$(CYAN)Seeding database...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api seed
	@echo "$(GREEN)Database reset complete.$(NC)"

migrate: ## Run database migrations (dev mode - creates migration if needed)
	@echo "$(CYAN)Running migrations...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api prisma:migrate
	@echo "$(GREEN)Migrations complete.$(NC)"

migrate-deploy: ## Apply migrations (production mode)
	@echo "$(CYAN)Deploying migrations...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api prisma:migrate:deploy

migrate-generate: ## Generate new migration without applying
	@echo "$(CYAN)Generating migration...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api migrate:generate

migrate-status: ## Show migration status
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api exec prisma migrate status

seed: ## Seed database with test data
	@echo "$(CYAN)Seeding database...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api seed
	@echo "$(GREEN)Seeding complete.$(NC)"

prisma-studio: ## Open Prisma Studio (DB GUI)
	@echo "$(CYAN)Opening Prisma Studio...$(NC)"
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api prisma:studio

prisma-generate: ## Generate Prisma client
	$(COMPOSE_DEV) exec api pnpm --filter @mentory/api prisma:generate

db-shell: ## Open PostgreSQL shell
	$(COMPOSE_DEV) exec db psql -U mentory -d mentory

redis-shell: ## Open Redis CLI
	$(COMPOSE_DEV) exec redis redis-cli

# ============================================
# Build & Deploy
# ============================================
build: ## Build all packages
	@echo "$(CYAN)Building packages...$(NC)"
	pnpm build

build-docker: ## Build production Docker images
	@echo "$(CYAN)Building production images...$(NC)"
	$(COMPOSE_PROD) build

prod: ## Start production environment
	@echo "$(CYAN)Starting production environment...$(NC)"
	$(COMPOSE_PROD) up -d

# ============================================
# Code Quality
# ============================================
lint: ## Run linter
	@echo "$(CYAN)Running linter...$(NC)"
	pnpm lint

format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code...$(NC)"
	pnpm format

format-check: ## Check code formatting
	pnpm format:check

test: ## Run tests
	@echo "$(CYAN)Running tests...$(NC)"
	pnpm test

test-e2e: ## Run E2E tests
	@echo "$(CYAN)Running E2E tests...$(NC)"
	pnpm test:e2e

# ============================================
# Utilities
# ============================================
clean: ## Clean all build artifacts and node_modules
	@echo "$(YELLOW)Cleaning...$(NC)"
	pnpm clean
	rm -rf .pnpm-store
	@echo "$(GREEN)Clean complete.$(NC)"

install: ## Install dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	pnpm install
	pnpm --filter @mentory/shared build

shell-api: ## Open shell in API container
	$(COMPOSE_DEV) exec api sh

shell-web: ## Open shell in Web container
	$(COMPOSE_DEV) exec web sh

ps: ## Show running containers
	$(COMPOSE_DEV) ps

# ============================================
# MinIO (Object Storage)
# ============================================
minio-bucket: ## Create default MinIO bucket
	@echo "$(CYAN)Creating MinIO bucket...$(NC)"
	$(COMPOSE_DEV) exec minio mc alias set local http://localhost:9000 mentory mentory123
	$(COMPOSE_DEV) exec minio mc mb local/mentory-uploads --ignore-existing
	$(COMPOSE_DEV) exec minio mc anonymous set download local/mentory-uploads
	@echo "$(GREEN)Bucket created.$(NC)"

# ============================================
# Quick Start
# ============================================
setup: ## Initial project setup (install, build, start)
	@echo "$(CYAN)Setting up Mentory...$(NC)"
	cp -n .env.example .env || true
	pnpm install
	pnpm --filter @mentory/shared build
	$(COMPOSE_DEV) up --build -d
	@echo ""
	@echo "$(GREEN)✓ Mentory is ready!$(NC)"
	@echo ""
	@echo "  Web:      http://localhost:3000"
	@echo "  API:      http://localhost:4000"
	@echo "  MinIO:    http://localhost:9001"
	@echo "  MailHog:  http://localhost:8025"
	@echo ""

# One command to rule them all
start: ## 🚀 START (auto: prod if DOMAIN set, else dev)
	@if [ -n "$$DOMAIN" ]; then \
		$(MAKE) start-prod; \
	else \
		$(MAKE) start-dev; \
	fi

start-dev: ## Start full development stack on localhost ports
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║     MENTORY - Starting Everything     ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(CYAN)[1/5]$(NC) Checking prerequisites..."
	@command -v pnpm >/dev/null 2>&1 || { echo "$(YELLOW)Installing pnpm...$(NC)"; npm install -g pnpm; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker not found! Please install Docker Desktop.$(NC)"; exit 1; }
	@echo ""
	@echo "$(CYAN)[2/5]$(NC) Creating .env file..."
	@cp -n .env.example .env 2>/dev/null || true
	@echo ""
	@echo "$(CYAN)[3/5]$(NC) Installing dependencies..."
	@pnpm install
	@pnpm --filter @mentory/shared build
	@echo ""
	@echo "$(CYAN)[4/5]$(NC) Starting Docker containers..."
	@$(COMPOSE_DEV) up -d --build --renew-anon-volumes
	@echo ""
	@echo "$(CYAN)[5/5]$(NC) Waiting for services..."
	@sleep 5
	@echo ""
	@echo "$(CYAN)Running database migrations...$(NC)"
	@if [ -d apps/api/prisma/migrations ] && [ "$$(ls -A apps/api/prisma/migrations 2>/dev/null)" ]; then \
		$(COMPOSE_DEV) exec -T api pnpm --filter @mentory/api prisma:migrate:deploy; \
	else \
		$(COMPOSE_DEV) exec -T api pnpm --filter @mentory/api prisma:push; \
	fi
	@echo ""
	@echo "$(CYAN)Seeding database...$(NC)"
	@$(COMPOSE_DEV) exec -T api pnpm --filter @mentory/api seed 2>/dev/null || echo "$(YELLOW)⚠️  Seed will run separately$(NC)"
	@echo ""
	@echo "$(GREEN)╔═══════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║         ✓ MENTORY IS READY!           ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════╝$(NC)"
	@echo ""
	@LOCAL_IP=$$(hostname -I 2>/dev/null | awk '{print $$1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost"); \
	echo "  $(GREEN)🌐 Web App:$(NC)      http://$$LOCAL_IP:3000"; \
	echo "  $(GREEN)🔌 API:$(NC)          http://$$LOCAL_IP:4000"; \
	echo "  $(GREEN)❤️  Health:$(NC)       http://$$LOCAL_IP:4000/api/health/ready"; \
	echo "  $(GREEN)🛠️  Admin:$(NC)        http://$$LOCAL_IP:4000/admin"; \
	echo "  $(GREEN)📧 MailHog:$(NC)      http://$$LOCAL_IP:8025"; \
	echo "  $(GREEN)📦 MinIO:$(NC)        http://$$LOCAL_IP:9001"; \
	echo ""; \
	echo "  Also available at http://localhost:3000 (locally)"
	@echo "  $(GREEN)🗄️  Prisma:$(NC)       make prisma-studio"
	@echo ""
	@echo "  $(YELLOW)Test accounts:$(NC)"
	@echo "    maria.mentor@example.com / password123"
	@echo "    alex.mentor@example.com / password123"
	@echo "    ivan.mentee@example.com / password123"
	@echo "    anna.mentee@example.com / password123"
	@echo ""
	@echo "  $(CYAN)Commands:$(NC)"
	@echo "    make logs     - View logs"
	@echo "    make down     - Stop everything"
	@echo "    make help     - All commands"
	@echo ""

start-prod: ## Start production stack behind Caddy (domain ACME or IP internal TLS)
	@set -e; \
	echo ""; \
	echo "$(CYAN)╔═══════════════════════════════════════╗$(NC)"; \
	echo "$(CYAN)║   MENTORY - Production Deployment     ║$(NC)"; \
	echo "$(CYAN)╚═══════════════════════════════════════╝$(NC)"; \
	echo ""; \
	if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	if [ -z "$$TLS_EMAIL" ]; then \
		echo "$(YELLOW)TLS_EMAIL is empty. Example: TLS_EMAIL=admin@example.com make start-prod$(NC)"; \
		exit 1; \
	fi; \
	if [ -n "$$DOMAIN" ]; then \
		TARGET_HOST="$$DOMAIN"; \
		TLS_ISSUER_VALUE="$$TLS_EMAIL"; \
		TLS_MODE="acme"; \
	else \
		TARGET_HOST="$$(hostname -I 2>/dev/null | awk '{print $$1}')"; \
		[ -n "$$TARGET_HOST" ] || TARGET_HOST="localhost"; \
		TLS_ISSUER_VALUE="internal"; \
		TLS_MODE="internal"; \
	fi; \
	echo "$(CYAN)TLS mode: $$TLS_MODE ($(GREEN)$$TARGET_HOST$(CYAN))$(NC)"; \
	echo "$(CYAN)[1/4]$(NC) Stopping development stack (if running)..."; \
	$(COMPOSE_DEV) down --remove-orphans 2>/dev/null || true; \
	echo "$(CYAN)[2/4]$(NC) Building production images..."; \
	DOMAIN="$$TARGET_HOST" TLS_ISSUER="$$TLS_ISSUER_VALUE" $(COMPOSE_PROD) build; \
	echo "$(CYAN)[3/4]$(NC) Starting production stack..."; \
	DOMAIN="$$TARGET_HOST" TLS_ISSUER="$$TLS_ISSUER_VALUE" $(COMPOSE_PROD) up -d --remove-orphans; \
	echo "$(CYAN)[4/4]$(NC) Running production migrations..."; \
	if DOMAIN="$$TARGET_HOST" TLS_ISSUER="$$TLS_ISSUER_VALUE" $(COMPOSE_PROD) exec -T api sh -lc 'command -v pnpm >/dev/null 2>&1'; then \
		DOMAIN="$$TARGET_HOST" TLS_ISSUER="$$TLS_ISSUER_VALUE" $(COMPOSE_PROD) exec -T api pnpm --filter @mentory/api prisma:migrate:deploy; \
	else \
		DOMAIN="$$TARGET_HOST" TLS_ISSUER="$$TLS_ISSUER_VALUE" $(COMPOSE_PROD) exec -T api sh -lc 'apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma || apps/api/node_modules/.bin/prisma db push --schema apps/api/prisma/schema.prisma'; \
	fi; \
	echo ""; \
	echo "$(GREEN)✓ Production is up$(NC)"; \
	echo "  App:    https://$$TARGET_HOST"; \
	echo "  API:    https://$$TARGET_HOST/api"; \
	echo "  Admin:  https://$$TARGET_HOST/admin"; \
	if [ "$$TLS_MODE" = "internal" ]; then \
		echo "  Note:   Internal/self-signed TLS is used for IP (browser warning is expected)."; \
	fi; \
	echo ""

stop: down ## Stop everything (alias for down)

restart: down start ## Restart everything
