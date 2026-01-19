---
sidebar_position: 2
---

# Key Features

## 1. Structure Analysis
The system breaks down complex legal texts into structured JSON data:
- **Summaries**: Concise explanation of the Act's purpose.
- **Entity Extraction**: Identifies Ministries, Departments, and Boards.
- **Meeting Requirements**: Detailed extraction of meeting frequency, quorum, and procedural rules.
- **Board Composition**: Tracks appointment criteria and removal procedures for board members.
- **Categorization**: Automatically classifies acts into domains (e.g., Agriculture, Finance).

## 2. Intelligent Data Management
- **Fetch-Only Mode**: Prevents accidental re-analysis on page refreshes by strictly loading from cache unless explicitly overridden.
- **Auto-Repair**: Automatically fixes truncated or malformed JSON responses from the LLM without needing full re-execution.
- **History Tracking**: Keeps a history of analysis runs, allowing users to revert to previous versions or custom query results.

## 3. Custom Querying
Users can go beyond the standard analysis by providing **Custom Prompts**. This allows for specific questions about the text (e.g., "What are the penalties for non-compliance?"). These custom runs are saved in history with their prompts preserved.

## 4. Act Version Lineage
We maintain a visualization of the version history for acts.
- **Interactive Diagrams**: Mermaid diagrams show the relationship between original acts and their amendments.
- **Navigation**: Browse acts year-wise or alphabetically.
- **Source**: Diagrams are auto-generated from the legal corpus.
