# research

Research and development at Lanka Data Foundation. 

## Acts

This repository includes the `lk_legal_docs` submodule, which provides a curated collection of Sri Lankan legal documents, such as the Tourism Act No. 38 of 2005, enabling research and analysis of legislative texts.

## Huggingface DeepSeek OCR Research

This project explores OCR capabilities using DeepSeek models on the Hugging Face platform, providing scripts and notebooks for extracting text from scanned documents and evaluating performance.

## Submodule Instructions

> [!WARNING]
> **Do not update the submodule unless absolutely necessary** – it contains a large number of files and updating it can be time‑consuming.

This repository uses Git submodules. To initialize and update submodules after cloning:

```sh
git submodule update --init --recursive
```

To add a new submodule:

```sh
git submodule add <repository-url> <path>
git commit -m "Add submodule <name>"
```

To update existing submodules:

```sh
git submodule update --remote --merge
git commit -am "Update submodules"
```

## Act Lineage Navigation

Explore the version history of Sri Lankan legal acts:

- [Act Version Lineage (interactive)](acts/research/lineage/README.md)

This page provides year‑wise and alphabetical navigation to Mermaid diagrams for each act.