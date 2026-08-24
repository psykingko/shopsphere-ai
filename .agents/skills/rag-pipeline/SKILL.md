---
name: RAG Pipeline Reference
description: Guidelines for implementing the vector search pipeline without copying reference repository code.
---

# RAG Pipeline Reference

## Context
ShopSphere uses Qdrant for vector search and relies solely on local models.

## Guidelines
- Do not copy code directly from the `multi-agent-rag-customer-support` reference repository. Reimplement independently.
- Separate concerns clearly: ingestion, chunking, embedding, indexing, retrieval, filtering, context construction, and generation.
- Ensure metadata filtering is used where appropriate.
- Do not pass the entire knowledge base to the LLM context.
- Always log the source chunks/documents for auditability.
