# System Setup & Operations Guide

This guide details how to set up the implementation environment, manage the application cluster, and handle data persistence.

## 1. Prerequisites

- **Docker & Docker Compose**: For running the web and backend services.
- **Mamba (or Conda)**: For managing the Python research environment locally.
- **Make**: For running automation commands.

## 2. Environment Setup

The project uses a dedicated Conda environment named `research` for local development and script execution.

```bash
# Enter legislation directory
cd legislation

# Create the environment
mamba env create -f environment.yml

# Activate the environment
mamba activate research
```

## 3. Quick Start (Cluster)

We provide a `Makefile` to simplify common operations.

### Start the System
This command builds the Docker containers (if needed), starts them, and automatically restores the latest data dump to the database.

```bash
make cluster-up
```
*   **Frontend**: http://localhost:3000
*   **Backend API**: http://localhost:8000
*   **Backend Documentation**: http://localhost:8000/docs

### Stop the System
To safely shut down the cluster and **automatically dump** the latest analysis data to JSON before exit:

```bash
make cluster-down
```

## 4. specific workflows

### Data Persistence & Reset
The system uses `sqlite` (`database/research.db`).
- **Persistence**: Data is saved to `research.db` in the volume.
- **Backup**: `make dump` (or `make cluster-down`) saves the DB content to `reports/database/dump/`.
- **Restore**: On `cluster-up`, the backend checks `reports/database/dump/` and restores the latest JSON dump if the DB is empty.

### Full System Reset
To completely wipe the database and start fresh (useful for testing restoration or clearing bad data):

```bash
# 1. Stop containers and DELETE research.db
make clean

# 2. Start fresh (will import from latest dump if available)
make cluster-up
```

### Manual Database Operations
If you need to manually save or load data without managing the cluster:

#### Dump Data
Saves current `ActAnalysis`, `TelemetryLog`, and `AnalysisHistory` to a JSON file in `reports/database/dump/`.
```bash
make dump
# OR directly via CLI
python -m pylegislation.cli research dump-analysis
```

#### Restore Data
Loads data from a specific JSON dump file into the database.
```bash
# Must be run from project root
legislation research load-analysis reports/database/dump/analysis_dump_YOUR_TIMESTAMP.json
```

## 5. Testing

Run the test suites using the configured environment:

```bash
# Unit Tests
make test

# Integration Tests
make integration-test
```

## 6. Developer Notes

- **CLI Tools**: The `pylegislation` package provides CLI tools called `legislation`.
    - `legislation research --help`
- **Linting**:
    - Web: `cd ui && npm run lint`
