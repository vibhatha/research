---
sidebar_position: 2
---

# GztExtractor

<span className="status-badge status-badge--beta">BETA</span><span className="status-text">Research Work in Progress</span>

The **GztExtractor** is an LLM-based tool for extracting structured data from Sri Lankan gazette PDFs.

## Features

- **Ministry/Department Initial Gazette Extraction**: Extract the complete structure of ministries and their departments from initial gazettes
- **Amendment Gazette Extraction**: Extract changes (additions, omissions) from amendment gazettes
- **Person Gazette Extraction**: Extract personnel assignments including Ministers, State Ministers, Deputy Ministers, and Secretaries

## Supported Gazette Types

| Type | Description |
|------|-------------|
| `ministry-initial` | Initial gazette defining ministry structure |
| `ministry-amendment` | Amendment gazette with structural changes |
| `persons` | Personnel appointment gazettes |

## Setup

### Prerequisites

- Python 3.8+
- OpenAI API key

### Installation

1. Navigate to the extractor directory:
   ```bash
   cd gazettes/extractor
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the environment:
   ```bash
   # Linux/Mac
   source venv/bin/activate

   # Windows (PowerShell)
   venv/Scripts/Activate.ps1
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Set API Key

```bash
# Linux/Mac
export OPENAI_API_KEY=<YOUR_API_KEY>

# Windows (PowerShell)
$env:OPENAI_API_KEY=<YOUR_API_KEY>
```

### Run Extraction

```bash
python cli.py --type <gazette_type> --pdf <path_to_pdf> --output <output_directory>
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--type` | Yes | One of: `ministry-initial`, `ministry-amendment`, `persons` |
| `--pdf` | Yes | Path to the gazette PDF file |
| `--output` | No | Output directory (default: `./outputs`) |

### Examples

Extract ministry structure from initial gazette:
```bash
python cli.py --type ministry-initial --pdf ./sample_gazette.pdf
```

Extract amendments:
```bash
python cli.py --type ministry-amendment --pdf ./amendment_gazette.pdf --output ./results
```

Extract personnel data:
```bash
python cli.py --type persons --pdf ./person_gazette.pdf
```

## Output Format

### Ministry Initial Output

```json
{
  "ministers": [
    {
      "name": "Ministry of Finance",
      "departments": ["Department of Treasury", "Inland Revenue", "Customs"]
    }
  ]
}
```

### Amendment Output

```json
{
  "ADD": [
    { "ministry": "Ministry of Finance", "department": "New Department" }
  ],
  "OMIT": [
    { "ministry": "Ministry of Finance", "department": "Old Department" }
  ]
}
```

### Person Output

```json
{
  "ADD": [
    { "person": "Hon. John Doe", "ministry": "Ministry of Finance", "position": "Minister" }
  ],
  "TERMINATE": [
    { "person": "Hon. Jane Doe", "ministry": "Ministry of Finance", "position": "Minister" }
  ]
}
```

## Project Structure

```
extractor/
├── cli.py              # Command-line interface
├── main.py             # Main extraction logic
├── extractors/         # Extraction modules
├── loaders/            # PDF loading utilities
├── mergers/            # Data merging utilities
├── prompts/            # LLM prompts for each gazette type
├── assets/             # Static assets
└── requirements.txt    # Python dependencies
```
