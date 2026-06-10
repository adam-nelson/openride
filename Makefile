.PHONY: install up down reset seed types lint test sim help

help:
	@echo "OpenRide — local dev commands"
	@echo ""
	@echo "  make install   Install all workspace dependencies"
	@echo "  make up        Start Supabase + supporting services"
	@echo "  make down      Stop services"
	@echo "  make reset     Wipe DB and re-apply migrations + seeds"
	@echo "  make seed      Re-run seed only"
	@echo "  make types     Regenerate DB types into packages/db"
	@echo "  make lint      Lint all packages"
	@echo "  make test      Run all tests"
	@echo "  make sim       Run dispatch simulation"

install:
	pnpm install

up:
	pnpm db:start

down:
	pnpm db:stop

reset:
	pnpm db:reset

seed:
	psql "$$DATABASE_URL" -f packages/db/seeds/demo.sql

types:
	pnpm db:types

lint:
	pnpm lint

test:
	pnpm test

sim:
	pnpm sim
