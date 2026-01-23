---
sidebar_position: 3
---

# GztProcessor

<span className="status-badge status-badge--beta">BETA</span><span className="status-text">Research Work in Progress</span>

The **GztProcessor** is a Python library for tracking and versioning structural changes in Sri Lankan government gazettes. It processes the JSON output from GztExtractor and maintains a versioned state of government structure.

## Features

- Process extracted gazette data (JSON format)
- Detect and classify transactions: `ADD`, `TERMINATE`, `MOVE`, `RENAME`
- Maintain versioned state snapshots for rollback/history
- Output CSVs for Neo4j graph database integration
- FastAPI backend for interactive review
- React frontend for visualization

## Supported Data Types

### MinDep (Ministries and Departments)
Tracks structural changes in government ministries and departments:
- **ADD**: New department added to a ministry
- **TERMINATE**: Department removed from a ministry
- **MOVE**: Department transferred between ministries

### Person
Tracks personnel-portfolio assignments:
- **ADD**: New appointment
- **TERMINATE**: Removal from position
- **RENAME**: Ministry/portfolio name change
- **MOVE**: Transfer between portfolios

## Setup

### Package Installation

```bash
# Basic installation
pip install git+https://github.com/sehansi-9/gztprocessor.git

# For development
pip install -e .

# With API features
pip install "git+https://github.com/sehansi-9/gztprocessor.git#egg=gztprocessor[api]"
```

### Full Project Setup

1. Navigate to the processor directory:
   ```bash
   cd gazettes/preprocess
   ```

2. Install Python dependencies:
   ```bash
   python -m pip install --upgrade pip
   python -m pip install nltk rapidfuzz fastapi uvicorn
   ```

3. Start the FastAPI backend:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`

4. Start the frontend (in a new terminal):
   ```bash
   cd gztp-frontend
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Input Formats

### MinDep Initial Gazette

```json
{
  "ministers": [
    {
      "name": "Ministry of Finance",
      "departments": [
        { "name": "Department of Treasury" },
        { "name": "Inland Revenue", "previous_ministry": "Ministry of Revenue" }
      ]
    }
  ]
}
```

### MinDep Amendment Gazette

```json
{
  "transactions": {
    "moves": [...],
    "adds": [...],
    "terminates": [...]
  }
}
```

### Person Gazette

```json
{
  "transactions": {
    "moves": [...],
    "adds": [...],
    "terminates": [...]
  }
}
```

## CSV Output

CSVs are generated in `output/`, organized by type, date, and gazette number.

### MinDep CSV Format

```csv
transaction_id,parent,parent_type,child,child_type,rel_type,date
2297-78_tr_01,Minister of Labour,minister,Vocational Training Authority,department,AS_DEPARTMENT,2022-09-16
```

### Person CSV Format

```csv
transaction_id,parent,parent_type,child,child_type,rel_type,date
2067-09_tr_01,"Ministry of Science, Technology & Research",minister,Hon. John Doe,person,AS_APPOINTED,2018-04-12
```

## State Snapshots

Snapshots are saved as JSON in `state/mindep/` and `state/person/`.

### MinDep State Example

```json
{
  "ministers": [
    {
      "name": "Minister of Finance",
      "departments": ["Department of Treasury", "Inland Revenue", "Customs"]
    }
  ]
}
```

### Person State Example

```json
{
  "persons": [
    {
      "person_name": "Hon. John Doe",
      "portfolios": [
        { "name": "Ministry of Roads and Highways", "position": "Minister" }
      ]
    }
  ]
}
```

## Project Structure

```
preprocess/
├── main.py                 # FastAPI application entry point
├── gztprocessor/           # Core library
│   ├── database_handlers/  # Database operations
│   ├── gazette_processors/ # Gazette processing logic
│   ├── state_managers/     # State management
│   ├── db_connections/     # Database connections
│   ├── schemas/            # Data schemas
│   └── csv_writer.py       # CSV output
├── routes/                 # API route handlers
├── gztp-frontend/          # React frontend
├── input/                  # Sample input files
├── request_body/           # Sample API payloads
└── pyproject.toml          # Package configuration
```

## Matching Algorithm

For person gazettes, the system uses intelligent matching:

- **Stemming**: NLTK's PorterStemmer for word normalization
- **Fuzzy Matching**: RapidFuzz for similarity scoring (token sort ratio)
- **Threshold**: Default score of 70 for match suggestions
- **Word Overlap**: Additional matching based on common words

These features help identify potential terminates for adds/moves when ministry names have slight variations.
