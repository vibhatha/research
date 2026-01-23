---
sidebar_position: 1
---

# Introduction

<span className="status-badge status-badge--beta">BETA</span><span className="status-text">Research Work in Progress</span>

The **Gazette Analysis** project provides tools for extracting and processing Sri Lankan government gazette data. It consists of two main components that work together to transform raw gazette PDFs into structured, versioned data.

## Overview

Sri Lankan government gazettes contain critical information about:
- Ministry and department structures
- Amendments to government organizational structures
- Personnel appointments (Ministers, State Ministers, Deputy Ministers, Secretaries)

This project automates the extraction of this information using LLMs and provides a system to track changes over time.

## Components

### GztExtractor

An LLM-based extraction tool that processes gazette PDFs and extracts structured data:
- Ministry/Department initial gazette extraction
- Amendment gazette extraction
- Person gazette extraction

### GztProcessor

A Python library and API for tracking structural changes:
- Processes extracted gazette data (JSON format)
- Detects and classifies transactions (ADD, TERMINATE, MOVE, RENAME)
- Maintains versioned state snapshots
- Outputs CSVs for Neo4j integration
- Provides a FastAPI backend with React frontend for interactive review

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Gazette PDF   │────▶│  GztExtractor   │────▶│   JSON Output   │
└─────────────────┘     │   (LLM-based)   │     └────────┬────────┘
                        └─────────────────┘              │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   CSV Output    │◀────│  GztProcessor   │
                        │   (for Neo4j)   │     │   (FastAPI)     │
                        └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  State Snapshots│
                                                │   (Versioned)   │
                                                └─────────────────┘
```

## Use Cases

1. **Government Structure Tracking**: Monitor changes in ministry and department structures over time
2. **Personnel Tracking**: Track appointments and removals of key government officials
3. **Historical Analysis**: Query the state of government structure at any point in time
4. **Data Integration**: Export structured data to graph databases like Neo4j for relationship analysis
