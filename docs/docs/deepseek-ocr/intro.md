---
sidebar_position: 1
---

# Introduction

<span className="status-badge status-badge--beta">BETA</span><span className="status-text">Research Work in Progress</span>

The **DeepSeek OCR** project evaluates the performance of DeepSeek-VL (Vision Language) models for Optical Character Recognition, particularly focusing on complex document structures and Sri Lankan legal texts.

## Documentation

### Findings
- [**Experiments**](./experiments) - DeepSeek OCR vs Gemini 2.0 comparison study

### Technology
- [**Setup**](./setup) - Installation and environment configuration
- [**Usage**](./usage) - How to use the OCR library

## Objectives

-   **Benchmark Accuracy**: Evaluating text extraction quality against standard OCR tools.
-   **Structured Extraction**: Successfully demonstrating the ability to extract organizational charts and tabular data directly into JSON.
-   **Optimization**: Re-using the loaded model for both OCR and post-processing to minimize VRAM usage.

## Architecture

The project has evolved into a reusable Python library `ldf.deepseek.ocr` that supports:
1.  **Batch Processing**: Efficiently processing folders of PDF documents.
2.  **Multi-Agent Workflow**: A sophisticated pipeline involving:
    -   **Extractor**: Runs the core DeepSeek-OCR model to get raw text.
    -   **Processor**: Structures raw text into JSON based on custom prompts/schemas.
    -   **Aggregator**: Stitches multi-page documents together, handling context continuation.
    -   **Finalizer**: Validates and saves the consolidated output.
