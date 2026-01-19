---
sidebar_position: 4
---

# Experiments: DeepSeek OCR vs Gemini 2.0

We conducted a study to compare the performance and cost of DeepSeek OCR against Google's Gemini 2.0 Flash Files API for document extraction tasks.

## Methodology

Both workloads used an **agentic workflow** with a map-reduce approach:
1.  **Map**: Feed each page to the model/tool for processing.
2.  **Reduce**: Aggregate the outputs to form the final response.

## Cost & Performance Comparison

| Metric | DeepSeek OCR | Gemini 2.0 Flash | Notes |
| :--- | :--- | :--- | :--- |
| **Cost** | ~$0.36 | **~$0.03** | Gemini is approx. **12x cheaper** |
| **Token Count** | Baseline | ~+1.3% | Almost identical tokenization |
| **Environment Setup** | Complex | Zero | DeepSeek required extensive local setup |

## Observations

### 1. Cost Efficiency
The **Gemini 2.0 Flash** approach proved significantly cheaper ($0.03 vs $0.36) for effectively the same workload.

### 2. Token Alignment
Input token counts were nearly identical (~1.3% difference), suggesting that the inputs were processed similarly by both tokenizers.

### 3. Accuracy
**Gemini 2.0 Flash** demonstrated comparatively higher accuracy than DeepSeek OCR out-of-the-box.
*   While DeepSeek OCR could potentially improve with prompt engineering (gridding), the associated costs of fine-tuning and development would be higher.
*   We estimated ~14.19 USD spent just on setting up the environment and iterating with DeepSeek.
*   DeepSeek's cost is exacerbated by the lack of local CUDA access, forcing reliance on paid infrastructure (Hugging Face).

## Key Takeaways

While **Gemini 2.0 Flash** is currently the more cost-effective and accurate "plug-and-play" solution, **DeepSeek OCR** (and Hugging Face tools in general) remain valuable for:
*   Custom workflows that require specific fine-tuning.
*   Scenarios where data privacy requires fully local processing (if hardware permits).
