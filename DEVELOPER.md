# Research Repository Developer Guide

This repository contains multiple research projects and tools for the **Lanka Data Foundation**.

## Projects

*   **Legislation** (`legislation/`): Acts Navigation & Analysis system.
    *   [Legislation Developer Guide](legislation/DEVELOPER.md)

*   **OCR** (`hugging-face-deepseek-ocr/`): OCR Experiments and Tools.
    *   [OCR Developer Guide](hugging-face-deepseek-ocr/DEVELOPER.md)

## General Best Practices

### 1. Project Independence
Each project (e.g., `legislation`) is structured as its own module with its own:
-   `environment.yml` or `requirements.txt`
-   `DEVELOPER.md` (Project-specific setup)
-   `tests/`

### 2. Documentation
-   **Root `DEVELOPER.md`**: This file. High-level overview and links.
-   **Project `DEVELOPER.md`**: Specific instructions for setting up and running a single project.

### 3. Tool Usage
-   **Mamba/Conda-lock**: Use strictly defined environments to avoid conflict between research tools.
-   **Pre-commit**: Ensure hooks are enabled to catch linting issues early.
-   **Git Submodules**: Some external tools/data might be included as submodules; always run `git submodule update --init --recursive` after cloning.

### 4. Code & Data
-   **Data Separation**: Big datasets should not be committed. Use `dvc` or specific `data/` directories ignored by git.
-   **Secrets**: Never commit API keys. Use `.env` files and `python-dotenv`.

## Getting Started

1.  Clone this repository:
    ```bash
    git clone <repo-url>
    cd research
    ```

2.  Navigate to your specific project of interest (e.g., `legislation`) and follow its `DEVELOPER.md`.
