---
name: Agent Orchestration
description: Guidelines for LangGraph state handling and workflow coordination.
---

# Agent Orchestration

## Context
Agent workflows are managed by Python (FastAPI + LangGraph) but persist state in Node.js (PostgreSQL).

## Guidelines
- Python handles ephemeral execution. Workflows and long-term state are stored in the Node.js backend.
- Node.js invokes FastAPI endpoints when an AI decision or action is required.
- Do not implement state polling loops if a stateless trigger is sufficient.
- Sensitive actions must emit a request for human-in-the-loop approval, and await explicit authorization via the backend before execution.
