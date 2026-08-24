---
description: Always-on project context and architectural guardrails for ShopSphere AI.
---

# ShopSphere AI - Project Context

This rule provides the strict, high-level context and architectural guardrails for ShopSphere AI. **For detailed specifications, the frozen documents in `docs/` are the absolute source of truth.**

### 1. Project Purpose
ShopSphere AI is a local-first e-commerce AI platform providing automated customer support and internal company operations via a single intelligent agent.

### 2. Approved Technology Stack
- **Frontend**: React (JavaScript)
- **Backend**: Node.js / Express (JavaScript)
- **AI Service**: Python / FastAPI
- **Database**: PostgreSQL
- **Vector Store**: Qdrant
- **LLM/Orchestration**: Ollama (local models only) / LangGraph
- **Protocol**: Model Context Protocol (MCP)

### 3. Frontend Architecture
A React SPA written in strict JavaScript. It communicates entirely via REST APIs to the Node.js backend. It does not connect to the AI service directly.

### 4. Node.js Backend Architecture
The Node.js (JavaScript) backend is the authoritative business layer. It owns authentication, authorization, business rules, and database persistence. It also hosts the MCP Server.

### 5. Python AI Service Architecture
The FastAPI (Python) service is the untrusted AI intelligence layer. It hosts LangGraph, handles RAG operations, and acts as the MCP Client.

### 6. PostgreSQL Ownership
PostgreSQL is strictly owned and accessed ONLY by the Node.js backend. The AI Service cannot connect to it directly.

### 7. RAG / Qdrant Ownership
The AI Service owns RAG operations (ingestion, chunking, embedding) and interacts with Qdrant for vector retrieval.

### 8. Ollama / Local-Model Requirement
The system relies exclusively on local LLMs run via Ollama. External cloud LLM APIs or paid services are prohibited.

### 9. MCP Boundary
The Model Context Protocol (MCP) bridges the AI Service (Client) and Node Backend (Server). The AI service requests tool execution, but the Node backend validates authorization and idempotency for every call.

### 10. LangGraph Role
A single, unified LangGraph orchestrator handles all intents (knowledge, customer support, operations). Specialized autonomous agent swarms are prohibited.

### 11. Human Approval Boundary
Sensitive mutations (e.g., refunds, cancellations) are blocked from immediate execution. The AI must submit an `ApprovalRequest` to Node, which requires explicit human manager approval to execute.

### 12. Documentation Source of Truth
The documentation hierarchy is explicit:

- `PROJECT_MASTER.md`: high-level project authority
- Frozen architecture/design documents: detailed architectural and technical constraints
- `FEATURES.md`: controlled implementation scope, priorities, dependencies, and status

The architecture and design documents in `docs/` are frozen unless explicitly approved for revision.

`docs/FEATURES.md` is the controlled, living implementation backlog and may be updated as features progress, provided changes remain consistent with the frozen architecture. `FEATURES.md` must not override frozen architecture.

### 13. FEATURES.md Implementation Control
Project scope is strictly bound to `docs/FEATURES.md`. The AI cannot invent features, create alternative layers, or expand scope autonomously. 

### 14. Reference Repositories
Reference repositories are strictly read-only for inspiration. Code must be reimplemented independently to fit ShopSphere's architecture, never copy-pasted directly. Reference repositories are outside the ShopSphere AI source tree and must never be modified as part of ShopSphere implementation.

### 15. Strict JavaScript Requirement
The Frontend and Node Backend must be written in **JavaScript**. TypeScript is explicitly out of scope.

### 16. Python Requirement
The AI Service must be written in **Python**.
