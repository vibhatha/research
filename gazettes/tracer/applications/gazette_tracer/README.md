## gazette_tracer

Move this application to a separate repo

This example demonstrates how to use the Gazette Tracer to trace the relationships between gazettes.

## Run the Flask server

### Prerequisites

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=your_username
export NEO4J_PASSWORD=your_password
```

### Setup

```bash
pip install -r requirements.txt
```

### Insert data

```bash
gazetterunner insert data/gazettes.csv data/gazette_relationships_with_dates.csv
```

### Delete Data

```bash
gazetterunner delete
```

### Start the server

```bash
gazetterunner start
```

## Run the React app

```bash
cd ui/gazette-visualizer
npm run dev
```