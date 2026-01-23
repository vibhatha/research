---
sidebar_position: 1
---

# Introduction

<span className="status-badge status-badge--alpha">ALPHA</span><span className="status-text">Research Work in Progress</span>

The **Legislative Analysis** project focuses on making Sri Lankan legal documents more accessible and understandable through AI.

## Overview

This system ingests PDF documents of Legislative Acts and uses Google's **Gemini 2.0 Flash** model to perform a deep analysis. The results are structured, searchable, and easy to navigate.

## Documentation

### Analysis Tools
- [**Acts Browser**](./acts-browser) - Browse and search analyzed legislative acts
- [**Full Acts Archive**](./archive) - Complete library of all Sri Lankan acts

### Act Extract Tool
- [**Key Features**](./features) - Structure analysis, intelligent data management, custom querying
- [**UI Tool**](./ui-tool) - Web interface for analyzing acts
- [**Technology Stack**](./tech-stack) - Gemini 2.0 Flash, FastAPI, Next.js
- [**Architecture**](./architecture) - System design and data flow
- [**Setup & Usage**](./setup-usage) - Installation and configuration guide

## How to Run

### Quickstart

1.  **Bring up the cluster**:
    ```bash
    make cluster-up
    ```
    This starts both the FastAPI backend and the Next.js frontend.

2.  **Access the UI**:
    Navigate to `http://localhost:3000` to view the Acts.

3.  **Stop the cluster**:
    ```bash
    make cluster-down
    ```
    (Automatically dumps analysis data to JSON before stopping).
