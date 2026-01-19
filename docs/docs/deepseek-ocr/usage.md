---
sidebar_position: 3
---

# Usage

## Basic Batch Processing

To run the standard OCR application which processes all PDFs in a directory:

```bash
python ocr_app.py \
    --input_dir input/tourism \
    --output_dir output/tourism \
    --prompt_file input/tourism/prompt.txt
```

> [!IMPORTANT]
> This application defaults to `VLLM_USE_V1=0` to ensure compatibility with DeepSeek-OCR's custom logits processors.

## Multi-Agent Workflow

For complex documents requiring structured JSON output, use the workflow script:

```bash
python ocr_workflow_v2.py \
    --input_dir input/orgchart \
    --output_dir output/orgchart_workflow_v2 \
    --prompt_file input/orgchart/prompt.txt
```
