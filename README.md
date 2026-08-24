# ShopSphere AI

An AI-powered business operations and customer-support platform for a fictional e-commerce company.

## Project Status

**Phase 0:** Project Foundation

The foundational repository structure and core utilities have been established.

*Note: Server implementations (Express/FastAPI), business logic, and AI orchestrations are intentionally deferred to Phase 1 (`FOUNDATION-002` and `FOUNDATION-003`) and subsequent phases as per the `FEATURES.md` controlled backlog.*

## Architecture Summary

- **Frontend**: React SPA
- **Backend**: Node.js / Express (Authoritative business & MCP Server)
- **AI Service**: Python / FastAPI (LangGraph & MCP Client)
- **Database**: PostgreSQL (Owned by Backend)
- **Vector DB**: Qdrant (Owned by AI Service)
- **AI Models**: Local only (Ollama)

Please refer to the `docs/` directory for frozen architectural blueprints and design documents.
