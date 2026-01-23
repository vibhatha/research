---
sidebar_position: 5
---

# Gazette Tracer

<span className="status-badge status-badge--alpha">ALPHA</span><span className="status-text">Research Work in Progress</span>

Tools for extracting, tracing, and visualizing relationships between Sri Lankan government gazettes using LLMs and graph databases.

## Overview

The Gazette Tracer project consists of two main components:

1. **Doctracer** - Core Python library for LLM-based gazette extraction
2. **Applications** - Flask + React application for visualization

## Doctracer

A CLI tool and library for extracting structured information from gazette PDFs.

### Features

- Extract gazette amendments and structural changes
- Extract tabular data from gazette images
- Store relationships in Neo4j graph database
- CLI interface for batch processing

### Installation

```bash
cd gazettes/tracer/doctracer

# Create environment
mamba create -n doctracer_env python=3.9
conda activate doctracer_env

# Install
pip install -e .
```

### Environment Variables

```bash
export OPENAI_API_KEY=your_openai_key
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your_password
```

### Usage

```bash
# View available commands
doctracer --help

# Extract amendment data
doctracer extract --type extragazette_amendment --input sample.pdf --output output.json

# Extract table data from images
doctracer extract --type extragazette_table --input gzt_images/ --output output.txt
```

### Output Format

```json
{
  "metadata": {
    "Gazette ID": "2382/35",
    "Gazette Published Date": "2024-05-03",
    "Gazette Published by": "Authority"
  },
  "changes": {
    "RENAME": [],
    "MERGE": [],
    "MOVE": [],
    "ADD": [
      {
        "Parent Name": "Minister of Defence",
        "Child Name": "National Hydrographic Act No. 7 of 2024",
        "Type": "legislation",
        "Date": "2024-05-03"
      }
    ],
    "TERMINATE": []
  }
}
```

## Applications

A Flask + React application for tracing and visualizing gazette relationships.

### Features

- Neo4j-backed relationship storage
- Flask API for gazette data
- React UI for interactive visualization
- CSV data import/export

### Setup

```bash
cd gazettes/tracer/applications/gazette_tracer

# Install Python dependencies
pip install -r requirements.txt
```

### Running the Application

```bash
# Insert data from CSV
gazetterunner insert data/gazettes.csv data/gazette_relationships_with_dates.csv

# Start Flask server
gazetterunner start
```

### Running the UI

```bash
cd ui/gazette-visualizer
npm install
npm run dev
```

## Neo4j Setup

### Using Docker

```bash
# Build the image
docker build --build-arg NEO4J_USER=$NEO4J_USER --build-arg NEO4J_PASSWORD=$NEO4J_PASSWORD -t doctracer_neo4j .

# Run the container
docker run -p 7474:7474 -p 7687:7687 --name doctracer_neo4j_server \
    --env-file .env \
    -v neo4j_data:/data doctracer_neo4j:latest
```

### Environment File

Create a `.env` file:

```plaintext
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```
