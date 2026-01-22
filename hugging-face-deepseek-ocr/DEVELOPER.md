# DeepSeek-OCR Developer Guide

This document outlines the setup, architecture, and workflows for the **OCR (DeepSeek-based)** project.

## 1. Environment Setup

### Prerequisites
- **Conda** (Anaconda or Miniconda)
- **Git**
- **CUDA-capable GPU** (Recommended for VLLM/DeepSeek 1xL4 (minimum @ HGF))

### Installation (V2)

The project has been refactored into a standardized library. We recommend using the "V2" setup.

1.  **Run Setup Script**:
    This script creates the `deepseek-ocr-v2` environment and installs the package in editable mode.
    ```bash
    ./setup_v2.sh
    ```

2.  **Activate Environment**:
    Use the initialization script to activate the environment and set required environment variables (like `PYTHONPATH`).
    ```bash
    source init_v2.sh
    ```
    *Alternatively/Manually:*
    ```bash
    conda activate deepseek-ocr-v2
    export PYTHONPATH=$PYTHONPATH:$(pwd)/src
    ```

## 2. Architecture

### Library: `ldf.deepseek`
The core logic resides in `src/ldf/deepseek`.
-   **Package Name**: `ldf-deepseek-ocr`
-   **Dependencies**: Defined in `pyproject.toml` (includes `vllm`, `torch`, `transformers`).

### Key Scripts
-   **`ocr_workflow_v2.py`**: The main entry point for the Multi-Agent OCR workflow. It coordinates:
    1.  **Extraction**: Raw OCR using the DeepSeek model.
    2.  **Processing**: Structuring text into JSON using LLM capabilities.
    3.  **Aggregation**: Merging multi-page results.

## 3. Workflows

### Running Batch OCR
To process a directory of PDFs:

```bash
python ocr_workflow_v2.py \
    --input_dir input/my_docs \
    --output_dir output/my_results \
    --prompt_file input/my_docs/prompt.txt
```

### Developing/Modifying the Model
The underlying DeepSeek-OCR code is included as a submodule in `external/DeepSeek-OCR`.
-   If you need to modify core model behavior, checking out that submodule is required (`git submodule update --init --recursive`).
-   However, the `ldf` wrapper library abstracts most interactions.

## 4. Troubleshooting

### VLLM Compatibility
DeepSeek-OCR requires custom logits processors.
-   **Default**: The scripts default to `VLLM_USE_V1=0`.
-   **Issue**: If you see errors related to "LogitsProcessor", ensure this environment variable is set.

### GPU Memory
-   The workflow loads that model into VRAM.
-   If you encounter OOM (Out Of Memory) errors, try reducing batch sizes or ensuring no other processes are using the GPU.
