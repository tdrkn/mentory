# ============================================
# Mentory Makefile
# ============================================
# Usage: make <command>

.PHONY: help dev dev-full down logs clean reset-db migrate seed build test lint format

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
	$(COMPOSE_DEV) exec api pnpm prisma migrate deploy
	@echo "$(CYAN)Seeding database...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma db seed
	@echo "$(GREEN)Database reset complete.$(NC)"

migrate: ## Run database migrations (dev mode - creates migration if needed)
	@echo "$(CYAN)Running migrations...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma migrate dev
	@echo "$(GREEN)Migrations complete.$(NC)"

migrate-deploy: ## Apply migrations (production mode)
	@echo "$(CYAN)Deploying migrations...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma migrate deploy

migrate-generate: ## Generate new migration without applying
	@echo "$(CYAN)Generating migration...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma migrate dev --create-only

migrate-status: ## Show migration status
	$(COMPOSE_DEV) exec api pnpm prisma migrate status

seed: ## Seed database with test data
	@echo "$(CYAN)Seeding database...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma db seed
	@echo "$(GREEN)Seeding complete.$(NC)"

prisma-studio: ## Open Prisma Studio (DB GUI)
	@echo "$(CYAN)Opening Prisma Studio...$(NC)"
	$(COMPOSE_DEV) exec api pnpm prisma studio

prisma-generate: ## Generate Prisma client
	$(COMPOSE_DEV) exec api pnpm prisma generate

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
start: ## 🚀 START EVERYTHING - one command deployment
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
	@$(COMPOSE_DEV) up -d --build
	@echo ""
	@echo "$(CYAN)[5/5]$(NC) Waiting for services..."
	@sleep 5
	@echo ""
	@echo "$(CYAN)Running database migrations...$(NC)"
	@$(COMPOSE_DEV) exec -T api pnpm prisma migrate deploy 2>/dev/null || $(COMPOSE_DEV) exec -T api pnpm prisma db push 2>/dev/null || echo "$(YELLOW)⚠️  Migrations will run on first request$(NC)"
	@echo ""
	@echo "$(CYAN)Seeding database...$(NC)"
	@$(COMPOSE_DEV) exec -T api pnpm prisma db seed 2>/dev/null || echo "$(YELLOW)⚠️  Seed will run separately$(NC)"
	@echo ""
	@echo "$(GREEN)╔═══════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║         ✓ MENTORY IS READY!           ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "  $(GREEN)🌐 Web App:$(NC)      http://localhost:3000"
	@echo "  $(GREEN)🔌 API:$(NC)          http://localhost:4000"
	@echo "  $(GREEN)❤️  Health:$(NC)       http://localhost:4000/api/health/ready"
	@echo "  $(GREEN)📧 MailHog:$(NC)      http://localhost:8025"
	@echo "  $(GREEN)📦 MinIO:$(NC)        http://localhost:9001"
	@echo "  $(GREEN)🗄️  Prisma:$(NC)       make prisma-studio"
	@echo ""
	@echo "  $(YELLOW)Test accounts:$(NC)"
	@echo "    mentor@test.com / password123"
	@echo "    mentee@test.com / password123"
	@echo ""
	@echo "  $(CYAN)Commands:$(NC)"
	@echo "    make logs     - View logs"
	@echo "    make down     - Stop everything"
	@echo "    make help     - All commands"
	@echo ""

stop: down ## Stop everything (alias for down)

restart: down start ## Restart everything
