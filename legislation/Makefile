.PHONY: dump cluster-up cluster-down clean help test integration-test

PYTHON=mamba run -n research python

help:
	@echo "Available commands:"
	@echo "  make dump          - Dump analysis data to JSON"
	@echo "  make cluster-up    - Start Docker cluster (backend+frontend)"
	@echo "  make cluster-down  - Stop Docker cluster safely (dumps data first)"
	@echo "  make clean         - Stop cluster and DELETE database (research.db)"
	@echo "  make test          - Run unit tests"
	@echo "  make integration-test - Run integration tests"
	@echo "  make update-docs   - Generate acts.json and all_acts.json for docs"

update-docs:
	@echo "Updating acts data for docs..."
	legislation research update-docs

dump:
	@echo "Dumping analysis data..."
	legislation research dump-analysis

cluster-up:
	@echo "Starting backend and frontend..."
	docker-compose up -d

cluster-down: dump
	@echo "Scheming teardown (with dump)..."
	docker-compose down

clean: 
	@echo "Stopping cluster and removing volumes..."
	docker-compose down -v
	@echo "Removing research.db..."
	rm -f database/research.db
	@echo "Done. Restart with 'make cluster-up' (runs migrate/restore on boot)."

test:
	$(PYTHON) -m pytest tests

integration-test:
	$(PYTHON) -m pytest integration_tests
