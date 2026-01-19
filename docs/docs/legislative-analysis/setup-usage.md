---
sidebar_position: 6
title: Setup & Usage
---

# Setup & Usage Guide

This guide explains how to set up the Legislative Analysis system locally and how to use its features for analyzing Sri Lankan laws.

## Prerequisites

Ensure you have the following installed on your system:
*   **Docker Desktop**: For running the containerized application.
*   **Make**: For executing build automation commands.
*   **Python 3.10+**: (Optional) For running scripts directly if needed.

## Quick Start

The entire system is containerized and orchestrated via `docker-compose`, abstracted behind simple `Makefile` commands.

### 1. Start the Cluster

To spin up both the FastAPI backend and the Next.js frontend, run:

```bash
make cluster-up
```

This command will:
1.  Build the Docker images for the frontend and backend.
2.  Start the containers in detached mode.
3.  Ensure the SQLite database is initialized.

### 2. Access the Application

Once the cluster is up, open your web browser and navigate to:

**[http://localhost:3000](http://localhost:3000)**

You will be greeted by the Legislative Analysis dashboard.

## Using the System

### Browsing Acts
The home page lists all analyzed acts. You can:
*   **Search**: Filter acts by title or keyword.
*   **Filter**: Select specific domains (e.g., Agriculture, Finance).
*   **View Details**: Click on any act card to view its full analysis.

### System Architecture in Action
When you browse the UI:
1.  **Frontend**: The Next.js app fetches data from the backend APIs.
2.  **Backend**: The FastAPI service queries the `research.db` SQLite database.
3.  **Data**: The data you see was pre-processed using Google Gemini 2.0 Flash.

## Shutting Down

To stop the services and ensure all data is safely dumped to disk:

```bash
make cluster-down
```

> **Note**: This command automatically runs a data dump before stopping the containers, ensuring no analysis data is lost.

## Troubleshooting

### "Cluster not starting"
*   Check if Docker Desktop is running.
*   Ensure port `3000` (Frontend) and `8000` (Backend) are free.

### "Database cache missing"
*   If the UI is empty, you may need to re-run the extraction or ensure the `data/research.db` file exists.
