# Architecture Guardrails

1. **No direct DB access from Python**: The AI service must not access PostgreSQL directly. Node.js backend is the authoritative owner of data.
2. **Strict Directory Structure**: Keep the repository exactly aligned with `PROJECT_MASTER.md`. Do not create alternative folders such as `service/`, `handlers/`, `managers/`, `use-cases/`, `adapters/`, or `providers/` unless explicitly approved.
3. **Tool & MCP Bounds**: AI agents interact with business capabilities strictly through authenticated endpoints/tools. MCP is a standardized tool interface, not an authorization mechanism.
4. **No Paid APIs**: The project must remain fully functional using Ollama/local models. Do not add OpenAI or Anthropic dependencies.
