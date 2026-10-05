.DEFAULT_GOAL := help

.PHONY: help install format format-check check test build clean dev start dev-api dev-gql dev-grpc dev-worker dev-cron generate

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

format: ## Format the project with Prettier
	npm run format

format-check: ## Verify Prettier formatting without changing files
	npm run format:check

check: ## Run formatting, TypeScript, and tests
	npm run check

test: ## Run tests
	npm test

build: ## Build production JavaScript
	npm run build

clean: ## Remove generated build and coverage output
	rm -rf dist coverage

dev: ## Start the selected project runtime in watch mode
	npm run dev

start: ## Start the selected compiled project runtime
	npm start

dev-api: ## Start the REST API in watch mode
	npm run dev:api

dev-gql: ## Start GraphQL in watch mode
	npm run dev:gql

dev-grpc: ## Start gRPC in watch mode
	npm run dev:grpc

dev-worker: ## Start the queue worker in watch mode
	npm run dev:worker

dev-cron: ## Start the cron runtime in watch mode
	npm run dev:cron

generate: ## Generate code; example: make generate ARGS="api -m orders -r list-orders"
	npm run generate -- $(ARGS)
