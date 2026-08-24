# ShopSphere AI --- Project Master Blueprint

**Status:** Frozen / Architecture Lock\
**Purpose:** Master reference for ChatGPT, Google Antigravity, and the
developer.\
**Primary goal:** Build a zero-cost, local-first AI Business Operations
& Customer Support Platform that demonstrates modern AI engineering
without sacrificing clean software architecture.

------------------------------------------------------------------------

## 1. Project Vision

ShopSphere AI is a fictional e-commerce company's internal and
customer-support platform.

The system combines:

-   Customer support automation
-   Company knowledge RAG
-   Multi-step AI agents
-   Business tools
-   Human-in-the-loop approval
-   Internal task/workflow automation
-   MCP tool exposure
-   Role-based access
-   Auditability
-   AI evaluation and observability

The project is intentionally designed as a serious engineering project,
not a simple chatbot.

The AI should be able to retrieve company knowledge, inspect operational
data, reason about a request, call approved tools, and complete or
propose actions while respecting permissions and approval requirements.

### Core principle

AI-assisted development is allowed. AI-owned architecture is not.

The developer approves architecture and feature plans. Antigravity
implements within the approved boundaries.

------------------------------------------------------------------------

## 2. Project Goals

### Primary goals

1.  Demonstrate modern AI application engineering.
2.  Demonstrate RAG with a real vector database.
3.  Demonstrate agent orchestration with LangGraph.
4.  Demonstrate LangChain usage where it adds value.
5.  Demonstrate MCP through real business tools.
6.  Demonstrate human-in-the-loop safety.
7.  Demonstrate useful business automation.
8.  Demonstrate clean full-stack architecture.
9.  Run locally with no mandatory paid API.
10. Be understandable and defensible in interviews.
11. Maintain a clean, predictable, navigable codebase.
12. Measure AI quality and latency rather than claiming them.

### Non-goals

-   No fake "multi-agent" complexity.
-   No giant cloud architecture for the sake of resume keywords.
-   No paid APIs as a hard dependency.
-   No copying complete GitHub projects.
-   No uncontrolled AI-generated refactors.
-   No unnecessary microservices.
-   No premature Redis/Kafka/Kubernetes/AWS complexity.
-   No random folders or architectural patterns introduced by AI.

------------------------------------------------------------------------

## 3. Reference Repositories

Two repositories are used only as architectural references.

### Reference A --- Customer Support RAG

`ro-anderson/multi-agent-rag-customer-support`

Useful concepts to study:

-   LangChain
-   LangGraph
-   Qdrant
-   RAG
-   specialized agents
-   routing
-   tool calling
-   sensitive vs safe tools
-   human confirmation
-   conversation state
-   observability concepts

**IMPORTANT:** The repository has no license. Do not copy its source
code into this project unless explicit permission/license is obtained.
Reimplement concepts independently.

### Reference B --- HiveOps

`mamoor123/hiveops`

Useful concepts to study:

-   task management
-   workflow engine
-   AI agents
-   agent execution
-   retries/dead-letter behavior
-   knowledge base
-   RBAC
-   PostgreSQL
-   Docker
-   operational dashboard concepts

**IMPORTANT:** HiveOps is AGPL-3.0. This project must not be treated as
a codebase to fork and privately relicense. Use it as an architectural
reference unless a deliberate AGPL-compliant reuse decision is made.

### Reference rule

References are read-only learning material. Never modify them from the
main project agent.

------------------------------------------------------------------------

## 4. Final Product Concept

### Product name

ShopSphere AI

### Product description

An AI-powered business operations and customer-support platform for a
fictional e-commerce company.

### Main users

-   Customer
-   Support Agent
-   Support Manager
-   Operations Employee
-   Administrator
-   AI agents

------------------------------------------------------------------------

## 5. Main Product Areas

### A. Customer Support

Input examples:

-   "Where is my order?"
-   "I was charged twice."
-   "I want to return this product."
-   "My order was cancelled but money was deducted."
-   "What is your refund policy?"

Expected behavior:

1.  Understand request.
2.  Classify intent.
3.  Retrieve relevant company policy when needed.
4.  Retrieve operational data when needed.
5.  Decide whether a tool/action is required.
6.  Execute safe actions automatically.
7.  Request human approval for sensitive actions.
8.  Produce a grounded response.
9.  Record an audit trail.

### B. Company Knowledge

Employees can ask:

-   "What is our refund policy?"
-   "How long does standard shipping take?"
-   "When should a ticket be escalated?"
-   "What is the warranty process?"

The answer should come from the company's indexed knowledge base.

### C. Business Operations

Employees/managers can ask:

-   "Show unresolved high-priority tickets."
-   "Create a task for the finance team."
-   "Assign this task to Rahul."
-   "Escalate this customer issue."
-   "Summarize today's support workload."

### D. Workflow Automation

Example:

Ticket created → priority = HIGH → create escalation task → assign
support manager → notify manager → record execution

------------------------------------------------------------------------

## 6. Example End-to-End AI Flow

User: "My payment was deducted but my order was cancelled."

Flow:

1.  Request enters AI service.
2.  Triage agent identifies payment/order issue.
3.  Agent retrieves order.
4.  Agent retrieves payment.
5.  Agent retrieves cancellation/refund policy through RAG.
6.  Agent determines likely resolution.
7.  If no sensitive action is needed, generate response.
8.  If refund request is required, prepare sensitive action.
9.  Ask for human approval where policy requires it.
10. Execute approved action.
11. Write audit log.
12. Return final response.

------------------------------------------------------------------------

## 7. Technology Stack

### Frontend

-   React
-   Vite
-   JavaScript
-   Tailwind CSS

### Main backend

-   Node.js
-   Express
-   JavaScript

Responsibilities:

-   authentication
-   authorization
-   REST API
-   business operations
-   PostgreSQL access
-   ticket/order/task/workflow management

### AI service

-   Python
-   FastAPI
-   LangChain
-   LangGraph

Responsibilities:

-   agent orchestration
-   RAG
-   model interaction
-   AI-specific tools
-   MCP
-   AI evaluation
-   AI observability

### Data

-   PostgreSQL for structured operational data
-   Qdrant for vector search
-   local filesystem for source documents/evaluation datasets

### Local model

-   Ollama
-   Start benchmark with Qwen3 8B Q4_K_M
-   Also benchmark smaller alternatives such as Gemma 3 4B and Llama 3.1
    8B Q4_K_M

Model choice is empirical, not predetermined.

### Infrastructure

-   Docker
-   Docker Compose

No mandatory paid cloud service.

------------------------------------------------------------------------

## 8. High-Level Architecture

React/Vite → Node/Express → PostgreSQL

React/Vite → Node/Express → FastAPI AI service

FastAPI → LangGraph → LangChain → Ollama

FastAPI → Qdrant

FastAPI agents → business tools → Node APIs or approved service
interfaces

MCP → standardized business tools

### Architectural boundary

The AI service must not randomly access the PostgreSQL database.

AI agents interact with business capabilities through explicit
tools/interfaces.

------------------------------------------------------------------------

## 9. Repository Structure

``` text
ai-business-platform/
├── .agents/
│   ├── rules/
│   ├── skills/
│   ├── workflows/
│   └── agents/
│
├── docs/
│   ├── PROJECT_MASTER.md
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_CONTRACT.md
│   ├── AI_ARCHITECTURE.md
│   ├── RAG_DESIGN.md
│   ├── AGENT_DESIGN.md
│   ├── MCP_DESIGN.md
│   ├── SECURITY.md
│   ├── EVALUATION.md
│   ├── FEATURES.md
│   ├── DECISIONS.md
│   └── CHANGELOG.md
│
├── frontend/
├── backend/
├── ai-service/
├── data/
│   ├── seed/
│   ├── documents/
│   └── evaluation/
├── scripts/
├── tests/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

------------------------------------------------------------------------

## 10. Backend Organization

``` text
backend/src/
├── config/
├── middleware/
├── routes/
├── controllers/
├── services/
├── repositories/
├── models/
├── validators/
└── utils/
```

### Rules

Routes define endpoints only.

Controllers handle HTTP concerns.

Services contain business/application logic.

Repositories contain database access.

Validators handle input validation.

Models represent persistence/domain structures.

Utilities must be genuinely reusable and must not become a dumping
ground.

There must be exactly one canonical `services/` directory in the
backend.

Do not create:

-   `service/`
-   `helpers/services/`
-   `utils/services/`
-   random `*Service.js` files outside the service directory.

------------------------------------------------------------------------

## 11. AI Service Organization

``` text
ai-service/app/
├── api/
├── agents/
├── rag/
├── tools/
├── mcp/
├── models/
├── services/
├── schemas/
├── config/
└── utils/
```

### Responsibilities

`api/` --- AI HTTP endpoints.

`agents/` --- Agent definitions and orchestration.

`rag/` --- Document ingestion, chunking, embeddings, retrieval and RAG
pipelines.

`tools/` --- Business tool definitions and execution adapters.

`mcp/` --- MCP server/tool exposure.

`models/` --- AI model provider abstraction and model configuration.

`services/` --- AI-specific application services that do not belong to
an individual agent or tool.

`schemas/` --- Pydantic request/response/domain schemas.

------------------------------------------------------------------------

## 12. Naming Rules

### JavaScript

-   camelCase for variables/functions
-   PascalCase for React components/classes where appropriate
-   descriptive names
-   avoid abbreviations unless universally understood
-   use `.js` and `.jsx`

Examples:

`ticketService.js` `ticketController.js` `ticketRepository.js`
`TicketDetailsPage.jsx`

### Python

-   snake_case for modules/functions/variables
-   PascalCase for classes
-   type hints required for public functions

Examples:

`ticket_triage_agent.py` `refund_tools.py` `document_ingestion.py`

### Files

File names must describe purpose.

Avoid:

-   `helper.ts`
-   `misc.ts`
-   `common.ts`
-   `temp.ts`
-   `manager.ts`

unless the responsibility is genuinely broad and documented.

------------------------------------------------------------------------

## 13. Data Model

Initial relational entities:

-   users
-   roles
-   customers
-   products
-   orders
-   order_items
-   payments
-   shipments
-   refunds
-   tickets
-   ticket_messages
-   tasks
-   workflows
-   workflow_executions
-   audit_logs

The exact schema must be finalized in `DATA_MODEL.md` before
implementation.

------------------------------------------------------------------------

## 14. Synthetic Data

The application must not depend on private or scraped customer data.

Generate realistic synthetic data locally.

Initial target scale:

-   50,000 customers
-   5,000 products
-   200,000 orders
-   200,000 payments
-   100,000 tickets

These are targets for demonstrating data handling, not fake claims of
production scale.

The generator must be deterministic when given a seed.

------------------------------------------------------------------------

## 15. Knowledge Base

Create fictional ShopSphere documents:

-   refund policy
-   return policy
-   cancellation policy
-   payment policy
-   shipping policy
-   warranty policy
-   escalation policy
-   support SOP
-   customer service FAQ
-   product documentation

Pipeline:

``` text
documents
→ loader
→ cleaning
→ chunking
→ metadata
→ embeddings
→ Qdrant
→ retrieval
→ optional reranking
→ LLM
```

Every RAG response should expose or log the source chunks/documents
used.

------------------------------------------------------------------------

## 16. RAG Rules

RAG is not simply "put documents in a vector database."

The implementation should clearly separate:

1.  ingestion
2.  chunking
3.  embedding
4.  indexing
5.  retrieval
6.  filtering
7.  context construction
8.  generation
9.  evaluation

Avoid giant chunks.

Avoid sending the entire knowledge base to the LLM.

Prefer metadata filtering where appropriate.

------------------------------------------------------------------------

## 17. Agent Architecture

Initial agents:

### Triage Agent

Determines request type and routes work.

### Support Agent

Handles general support questions.

### Payment/Refund Agent

Handles payment and refund reasoning.

### Shipping Agent

Handles shipment/tracking issues.

### Operations Agent

Handles internal tasks and operational workflows.

Do not create agents unless they have distinct responsibilities.

------------------------------------------------------------------------

## 18. Tool Architecture

Tools should have explicit names, schemas, validation and permissions.

Safe examples:

-   get_customer
-   get_order
-   get_payment
-   get_shipment
-   get_ticket
-   search_knowledge

Sensitive examples:

-   request_refund
-   cancel_order
-   modify_customer
-   close_ticket
-   assign_task

Sensitive operations require explicit approval according to policy.

------------------------------------------------------------------------

## 19. MCP

MCP should expose selected business capabilities as standardized tools.

Initial candidates:

-   get_customer
-   get_order
-   get_payment
-   get_ticket
-   search_knowledge
-   create_ticket
-   create_task
-   assign_task
-   request_refund
-   escalate_ticket

Do not expose every internal function automatically.

MCP is an interface boundary, not a replacement for authorization.

------------------------------------------------------------------------

## 20. Authorization

Roles:

-   CUSTOMER
-   SUPPORT_AGENT
-   SUPPORT_MANAGER
-   OPERATIONS
-   ADMIN

The AI must not bypass application permissions.

A user asking the AI to perform an action does not automatically grant
permission to perform that action.

Authorization must be enforced by the tool/business layer, not merely by
an LLM prompt.

------------------------------------------------------------------------

## 21. Human-in-the-Loop

Sensitive actions can require approval.

Example:

``` text
AI proposes refund ₹4,999
→ policy check
→ approval required
→ manager approves
→ tool executes
→ audit log written
```

The UI should show:

-   proposed action
-   affected entity
-   reason
-   amount/data involved
-   policy basis if applicable
-   approve/reject controls

------------------------------------------------------------------------

## 22. Audit Logging

Record important AI actions:

-   timestamp
-   user
-   agent
-   tool
-   action
-   target entity
-   input summary
-   result
-   approval status
-   approver
-   error if any

Do not store secrets or unnecessary sensitive data in logs.

------------------------------------------------------------------------

## 23. Reliability

Agent execution must handle failures.

Initial strategy:

-   timeout
-   retry with bounded attempts
-   exponential backoff where appropriate
-   clear failure state
-   dead-letter concept for repeatedly failed jobs
-   structured error logs

Do not hide failures by endlessly retrying.

------------------------------------------------------------------------

## 24. Latency Strategy

Target a local demo that feels responsive.

Approximate targets:

-   simple RAG: seconds, ideally under \~8s
-   one tool call: ideally under \~12s
-   multi-step agent workflow: ideally under \~30s

These are targets, not guarantees.

Latency must be measured.

Optimize by:

-   using a small quantized local model
-   keeping prompts concise
-   limiting retrieved context
-   avoiding unnecessary agent hops
-   avoiding repeated LLM calls
-   using deterministic code for simple operations
-   using direct database/tool calls for factual lookups

------------------------------------------------------------------------

## 25. Local Model Benchmark

Benchmark at least:

-   Qwen3 8B Q4_K_M
-   Gemma 3 4B
-   Llama 3.1 8B Q4_K_M

Measure:

-   first-token latency
-   total latency
-   tokens/sec if available
-   RAM/VRAM usage
-   structured output reliability
-   tool calling reliability
-   RAG answer quality

Choose the model based on observed results.

------------------------------------------------------------------------

## 26. AI Evaluation

Create a controlled evaluation dataset.

Each case should contain:

-   input
-   expected intent
-   expected retrieved knowledge
-   expected tool/action
-   expected safety behavior
-   expected answer characteristics

Measure:

-   classification accuracy
-   retrieval quality
-   groundedness
-   tool-selection correctness
-   action correctness
-   refusal/safety behavior
-   latency

The project must not claim AI accuracy without evaluation.

------------------------------------------------------------------------

## 27. Observability

Every AI request should be traceable through:

``` text
request
→ selected agent
→ retrieval
→ tool calls
→ model calls
→ final answer
→ latency
→ errors
```

Initially use local structured logs/database records.

Do not make a paid observability platform mandatory.

------------------------------------------------------------------------

## 28. Frontend

Main UI areas:

-   Login
-   Dashboard
-   Support Inbox
-   Ticket Detail
-   AI Resolution Panel
-   Knowledge Base
-   Tasks
-   Workflows
-   Approval Queue
-   AI Activity/Audit Log
-   Settings

The UI should make AI actions visible rather than pretending the AI is
magic.

------------------------------------------------------------------------

## 29. API Architecture

REST APIs should follow:

``` text
Route
→ Controller
→ Service
→ Repository
```

AI endpoints:

``` text
Node API
→ FastAPI
→ Agent
→ Tool/RAG/LLM
```

API contracts must be documented before or alongside implementation.

------------------------------------------------------------------------

## 30. Documentation System

Required documents:

-   `PROJECT_MASTER.md` --- long-form project blueprint.
-   `PROJECT_SPEC.md` --- what the product must do.
-   `ARCHITECTURE.md` --- how components communicate.
-   `DATA_MODEL.md` --- database entities and relationships.
-   `API_CONTRACT.md` --- endpoints and request/response contracts.
-   `AI_ARCHITECTURE.md` --- agent/model/tool architecture.
-   `RAG_DESIGN.md` --- knowledge ingestion and retrieval architecture.
-   `AGENT_DESIGN.md` --- agent responsibilities and routing.
-   `MCP_DESIGN.md` --- MCP server/tools and security boundaries.
-   `SECURITY.md` --- authentication, authorization, secrets and AI
    safety.
-   `EVALUATION.md` --- evaluation datasets and metrics.
-   `FEATURES.md` --- feature inventory and status.
-   `DECISIONS.md` --- architecture decision records.
-   `CHANGELOG.md` --- important project changes.

------------------------------------------------------------------------

## 31. Antigravity Governance

Antigravity must follow project rules.

Before implementing a feature:

1.  Inspect existing architecture.
2.  Search for existing equivalent functionality.
3.  Produce a plan.
4.  List files to create/modify.
5.  Identify database/API changes.
6.  Wait for approval for non-trivial work.
7.  Implement only approved scope.
8.  Run relevant tests.
9.  Review changes for architecture violations.
10. Update documentation/status.

### Forbidden behavior

-   creating duplicate directories
-   introducing new architecture without approval
-   modifying unrelated files
-   rewriting working modules unnecessarily
-   adding dependencies without justification
-   copying reference repository code
-   changing naming conventions mid-project
-   bypassing service/repository boundaries
-   direct DB access from agents
-   exposing sensitive tools without authorization

------------------------------------------------------------------------

## 32. Change Scope Rule

A feature implementation should touch the smallest reasonable set of
files.

If implementation requires unrelated refactoring:

1.  stop
2.  explain why
3.  propose a separate refactor
4.  wait for approval

------------------------------------------------------------------------

## 33. Definition of Done

A feature is not complete until:

-   code works
-   tests pass
-   architecture rules are respected
-   no duplicate patterns were introduced
-   documentation is updated
-   error handling exists
-   relevant logs exist
-   security implications are considered
-   git diff has been reviewed

------------------------------------------------------------------------

## 34. Development Workflow

``` text
PLAN
↓
APPROVE
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
DOCUMENT
↓
COMMIT
```

Never skip PLAN for substantial features.

------------------------------------------------------------------------

## 35. Suggested Build Order

### Phase 0 --- Governance

-   repository
-   rules
-   skills
-   workflows
-   master docs

### Phase 1 --- Infrastructure

-   Docker
-   PostgreSQL
-   Qdrant
-   Ollama
-   backend
-   AI service
-   frontend

### Phase 2 --- Business Core

-   authentication
-   users/roles
-   customers
-   products
-   orders
-   payments
-   shipments
-   tickets
-   tasks

### Phase 3 --- Knowledge/RAG

-   documents
-   ingestion
-   chunking
-   embeddings
-   Qdrant
-   retrieval
-   grounded responses

### Phase 4 --- Agents

-   triage
-   support
-   payment/refund
-   shipping
-   operations

### Phase 5 --- Tools & Safety

-   business tools
-   sensitive tools
-   authorization
-   human approval
-   audit logs

### Phase 6 --- Operations

-   tasks
-   workflows
-   agent execution
-   retries
-   notifications

### Phase 7 --- MCP

-   MCP server
-   selected tools
-   authorization integration
-   tool testing

### Phase 8 --- Evaluation

-   dataset
-   retrieval evaluation
-   agent evaluation
-   latency benchmark

### Phase 9 --- Polish

-   UI
-   tests
-   documentation
-   architecture diagram
-   demo scenarios
-   README
-   resume bullets

------------------------------------------------------------------------

## 36. Resume Positioning

Do not describe the project as:

"Chatbot using LangChain."

Describe it as:

"AI-powered business operations and customer-support platform combining
RAG, multi-agent orchestration, MCP-based tool execution,
human-in-the-loop approvals, workflow automation and local LLM
inference."

Resume bullets should only claim features that are actually implemented
and tested.

------------------------------------------------------------------------

## 37. Interview Understanding Requirement

For every major technology, the developer must be able to explain:

-   RAG --- what problem it solves and how retrieval works.
-   Embeddings --- what they represent and why vectors are used.
-   Qdrant --- why a vector database is useful.
-   LangChain --- what abstractions are being used and why.
-   LangGraph --- why graph/state orchestration is useful.
-   Agents --- what makes an agent different from a simple LLM call.
-   Tools --- how the agent interacts with real systems.
-   MCP --- why standardized tool interfaces are useful.
-   Human-in-the-loop --- why sensitive AI actions need approval.
-   PostgreSQL --- why structured business data belongs in a relational
    DB.
-   Ollama --- why local inference is useful for a
    zero-cost/privacy-friendly demo.

------------------------------------------------------------------------

## 38. Golden Rules

1.  Clean architecture beats more features.
2.  Working features beat buzzwords.
3.  Measured claims beat impressive claims.
4.  Simple architecture beats unnecessary complexity.
5.  AI must not bypass authorization.
6.  Agents must use explicit tools.
7.  RAG must have evaluation.
8.  Sensitive actions must have safety controls.
9.  Every feature has a documented home.
10. No duplicate service directories.
11. No random new patterns.
12. No copying unlicensed source code.
13. Reference repositories are for learning, not blind reuse.
14. Antigravity plans before major implementation.
15. The developer approves architectural changes.
16. Keep the project local-first and ₹0 where practical.
17. Optimize for interview understanding, not technology count.
18. If a feature does not improve the product or demonstrate a
    meaningful engineering concept, do not add it.

------------------------------------------------------------------------

## 39. Current Status

**Status:** Architecture planning.

No production/application code should be generated until:

-   project specification is approved
-   architecture is approved
-   data model is approved
-   coding standards are established
-   Antigravity rules are installed
-   initial skills/workflows are installed
-   reference repositories are available as read-only references
-   the developer has approved the initial project skeleton
