# Gazette Tracer

Tools for extracting, tracing, and visualizing relationships between Sri Lankan government gazettes.

## Components

### Doctracer (`doctracer/`)

Core Python library for extracting information from gazette PDFs using LLMs and storing them in Neo4j.

**Features:**
- Extract gazette amendments and structural changes
- Extract tabular data from gazette images
- Store relationships in Neo4j graph database
- CLI interface for batch processing

[View Doctracer Documentation](doctracer/README.md)

### Applications (`applications/`)

Flask + React application for tracing and visualizing gazette relationships.

**Features:**
- Neo4j-backed relationship storage
- Flask API for gazette data
- React UI for visualization
- CSV data import/export

[View Applications Documentation](applications/gazette_tracer/README.md)

## Quick Start

### Prerequisites

- Python 3.9+
- Neo4j database
- Node.js (for UI)
- OpenAI API key

### Environment Setup

```bash
export OPENAI_API_KEY=your_openai_key
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your_password
```

### Install Doctracer

```bash
cd doctracer
pip install -e .
```

### Run the Application

```bash
cd applications/gazette_tracer

# Install dependencies
pip install -r requirements.txt

# Insert data
gazetterunner insert data/gazettes.csv data/gazette_relationships_with_dates.csv

# Start Flask server
gazetterunner start

# In another terminal, start the React UI
cd ui/gazette-visualizer
npm install
npm run dev
```
