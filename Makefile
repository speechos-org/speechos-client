.PHONY: help
.DEFAULT_GOAL := help

help:
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# Testing and building
test: ## Run SDK tests
	@npm test

build: ## Build SDK packages
	@npm run build

type-check: ## Run SDK type checking
	@npm run build:core && npm run type-check

# Release management
changeset: ## Create a new changeset for release
	@npx changeset

version: ## Apply changesets and bump versions (run before release PR)
	@npx changeset version

release: ## Build and publish packages to npm (requires NPM_TOKEN env var)
	@npm run build
	@npx changeset publish

release-dry-run: ## Show what would be published without actually publishing
	@npm run build
	@npx changeset status

# Development
certs: ## Generate SSL certificates for test page
	@npm run generate-certs

dev: ## Run SDK test page with Vite (supports IIFE/ESM/React modes)
	@npm run test:dev

watch: ## Watch and rebuild IIFE bundle
	@npm run dev:iife

# Installation
install: ## Install dependencies
	@npm ci

# catch-all for any undefined targets - this prevents error messages
# when running things like make install <package>
%:
	@:
