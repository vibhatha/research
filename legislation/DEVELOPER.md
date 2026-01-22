# Legislation Project Developer Guide

This document outlines the setup, architecture, and workflows for the **Legislation (Acts Navigation & Analysis)** project.

## 1. Environment Setup

### Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.8+)
- **Git**

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repo-url>
    cd research/legislation
    ```

2.  **Environment Setup (Mamba/Conda)**:
    It is required to use the isolated `research` environment.
    ```bash
    mamba env create -f environment.yml
    mamba activate legislation
    ```
    *Note: The environment will automatically install the package in editable mode.*

    **Verification**:
    ```bash
    legislation --help
    ```

    ```bash
    cd ui
    npm install
    ```

## 2. Web Application & Cluster Operations

We provide a `Makefile` to simplify common operations (building Docker containers, starting backend/frontend, and managing data).

### Quick Start (Cluster)

1.  **Start the System**:
    Builds containers and starts services. Automatically restores data from `reports/database/dump/`.
    ```bash
    make cluster-up
    ```
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:8000
    - Docs: http://localhost:8000/docs

2.  **Stop the System**:
    Safely shuts down and **automatically dumps** latest data to JSON.
    ```bash
    make cluster-down
    ```

3.  **Full Reset**:
    Wipe the database and start fresh (useful for testing restoration).
    ```bash
    make clean        # Delete research.db
    make cluster-up   # Start fresh (restores from dump if exists)
    ```

### Running Locally (Without Docker)
To start the development server manually:
```bash
cd ui
npm run dev
```
Visit http://localhost:3000 to view the app.

### Key Components
-   **Dashboard**: `ui/components/acts/Dashboard.tsx` - Main visualization hub.
-   **Acts Table**: `ui/components/acts/ActsTable.tsx` - Searchable data table.
-   **Lineage Engine**:
    -   `LineageView.tsx`: Visualization (timeline/tree).
    -   `LineageEditorPage.tsx`: Full-screen editor for creating patches.
    -   `LineagePatcher.tsx`: Quick-edit tool.

## 3. Database Persistence & Backup

The system uses a binary SQLite database (`database/research.db`) for operations, but supports **JSON-based backup and restore** for version control and persistence.

**Standard Dump Path**: `reports/database/dump/analysis_dump.json`

### Backup Data (Dump)
Save your current analysis results and telemetry logs to JSON:
```bash
legislation research dump-analysis reports/database/dump/analysis_dump.json
```

### Restore Data (Load)
Load data from JSON into your local database:
```bash
legislation research load-analysis reports/database/dump/analysis_dump.json
```

### Docker Persistence
The Docker container is configured to **automatically restore** data from `reports/database/dump/analysis_dump.json` when it starts. 
- Always run a dump before stopping containers/pushing code if you want to preserve new data.
- Ensure `reports/database/dump/analysis_dump.json` is committed to Git if you want to share the dataset.

## 4. Data Workflows

The system uses a TSV file as the source of truth (`reports/research/archive/docs_en_with_domain.tsv`) and generates static JSON for the frontend (`acts.json`, `lineage.json`).

### A. Categorization
If new acts are added to the source, run categorization to assign domains:
```bash
legislation research categorize
```

### B. Lineage Generation (Hot-Patching)
To generate the hierarchical data (`lineage.json`) used by the graph visualizations:
```bash
legislation research lineage
```
*Note: This script automatically looks for JSON patch files in `ui/public/data/patches/` and applies them to the output JSON without modifying the source TSV.*

### C. Data Processing (Main Acts JSON)
To generate the flat list of acts (`acts.json`) for the table:
```bash
legislation research process
```

### D. Adding a New Act
To add a missing legislative act to the system:

1.  **Edit the Archive TSV**:
    Open `reports/research/archive/docs_en.tsv` and append a new line with the following tab-separated columns:
    ```tsv
    doc_type	doc_id	num	date_str	description	url_metadata	lang	url_pdf	doc_number
    ```
    *Example*:
    ```tsv
    lk_acts	public-examinations-act-25-1968	25-1968-en	1968-XX-XX	Public Examinations Act No. 25 of 1968	manual_entry	en	https://lawnet.gov.lk/...	25/1968
    ```

2.  **Run the Pipeline**:
    execute the following commands to propagate the change:
    ```bash
    # 1. Assign domain and generate docs_en_with_domain.tsv
    legislation research categorize

    # 2. Update the frontend JSON (acts.json)
    legislation research process

    # 3. Update the API database
    legislation research migrate
    ```

## 5. Data Versioning & Patching

We use a version control system for the data itself to ensure integrity and history.

### Roles
-   **TSV Source**: The raw data file.
-   **Patch**: A JSON file describing a lineage relationship change (e.g. "Act A amended by Act B").
-   **Version**: A snapshot of the TSV file with specific patches applied.

### Workflow

1.  **Create a Patch**:
    -   Go to **Lineage Tools** in the Web App.
    -   Select acts and define relationships.
    -   Download the Patch JSON.
    -   Save it to `reports/research/patches/`.


2.  **Initialize Versioning** (First Time Only):
    Creates `v1` from your current source.
    ```bash
    legislation research version init
    ```

3.  **Apply a Patch**:
    Updates the TSV data by creating a new version (e.g., `v2`) containing the patch changes.
    ```bash
    legislation research version apply --file reports/research/patches/lineage_patch_NAME.json
    ```
    *This modifies the act descriptions in the new TSV branch (e.g., adds " (Amendment)") to verify the relationship.*

4.  **List Versions**:
    See the history of data changes.
    ```bash
    legislation research version list
    ```

## 6. Directory Structure

-   `reports/research/archive/`: Raw historical data.
-   `reports/research/versions/`: Versioned data snapshots (managed by script).
-   `reports/research/patches/`: JSON patch files.
-   `ui/public/data/`: Generated JSON files for the frontend application.
-   `scripts/`: Utilities for data processing.

## 7. LDF Library Usage

The `ldf` package can also be used as a Python library for custom scripts or notebooks.

### Example: Custom Categorization Script

```python
from pathlib import Path
from ldf.research.categorize import categorize_acts
from ldf.research.process import process_acts

# Define custom paths
input_tsv = Path("my_custom_data.tsv")
output_tsv = Path("categorized_data.tsv")
output_json = Path("final_output.json")

# Run categorization
categorize_acts(input_tsv, output_tsv)

# Process to JSON
process_acts(output_tsv, output_json)
```

### Example: Managing Versions Programmatically

```python
from pathlib import Path
from ldf.research.versions import apply_patch

# Apply a specific patch
patch_file = Path("reports/research/patches/lineage_patch_Education_Act.json")
apply_patch(patch_file)
```
