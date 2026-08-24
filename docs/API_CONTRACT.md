# API Contract

*Status: Frozen*
*Source of Truth: docs/PROJECT_MASTER.md*

---

## 1. Purpose and Scope

This document defines the strict communication interfaces and protocols between the various components of the ShopSphere AI platform. It explicitly documents the data formats, endpoints, and tool definitions required to bridge the Node.js business backend, the React frontend, and the Python FastAPI AI service, while strictly enforcing architectural and authorization boundaries.

---

## 2. Service Communication Overview

The system strictly enforces the following communication boundaries:

- **React Frontend ↔ Node Backend**: REST over HTTPS for standard operations. SSE (Server-Sent Events) proxied through Node.js for streaming AI responses.
- **Node Backend ↔ PostgreSQL**: Internal database connections via standard Postgres protocols (e.g., pg driver). Node.js maintains absolute ownership of this data.
- **Node Backend ↔ FastAPI AI Service**: Internal REST over HTTP. Node.js invokes the AI service and proxies streaming responses. Authentication is via internal service-to-service mechanisms.
- **FastAPI AI Service ↔ Qdrant**: Internal API connections for RAG. The Python AI service maintains ownership of vector embeddings.
- **FastAPI AI Service ↔ Node MCP Server**: Standard Model Context Protocol (MCP) using a client-server architecture. The FastAPI MCP client requests business actions from the Node MCP server.

**Strictly Prohibited**:
- Browser direct access to FastAPI.
- Browser direct access to the Node MCP Server.
- FastAPI direct access to PostgreSQL.
- Introduction of WebSockets, Kafka, Redis, or other unapproved infrastructure.

---

## 3. API Conventions

- **HTTP Methods**: Standard REST conventions (`GET` for reads, `POST` for creations/invocations, `PUT`/`PATCH` for updates, `DELETE` for removals).
- **JSON Format**: All structured payloads (requests and responses) must be `application/json` (except SSE streams).
- **Status Codes**: 
  - `200 OK`: Successful read/update.
  - `201 Created`: Successful creation.
  - `202 Accepted`: Sensitive action proposed and awaiting human approval (ApprovalRequest created).
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Missing or invalid authentication.
  - `403 Forbidden`: Insufficient permissions (RBAC failure).
  - `404 Not Found`: Entity does not exist.
  - `500 Internal Server Error`: Unhandled server/infrastructure faults.
  - `503 Service Unavailable`: AI service offline (proxied appropriately by Node).
- **Request IDs / Correlation IDs**: An `X-Request-ID` header must be generated at the Node public gateway and propagated to FastAPI and MCP requests for audit tracing.
- **Pagination**: Use `page` and `limit` query parameters. Responses should include `total`, `page`, and `limit` metadata.
- **Filtering**: Use standardized query parameters (e.g., `?status=OPEN&priority=HIGH`).
- **Validation**: Strict schema validation at the HTTP boundary before business logic execution.
- **Timestamps**: All timestamps must be in ISO 8601 UTC format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **UUID vs Business IDs**: Internal relationships use `UUID` v4. Customer-facing references use prefixed business IDs (e.g., `ORD-12345`).

---

## 4. Frontend → Node.js API

The React frontend communicates exclusively with the Node.js backend. This represents the MVP REST surface. Do not create unnecessary CRUD endpoints for every table.

### Authentication
- `POST /api/v1/auth/login`: Authenticate and issue secure session.

### Customer Management
- `GET /api/v1/customers/:id`: Fetch customer profile.

### Order, Payment & Shipment Management
- `GET /api/v1/orders`: List orders.
- `GET /api/v1/orders/:id`: Fetch specific order details.
- `GET /api/v1/payments/:id`: Fetch payment status and details.
- `GET /api/v1/shipments/:id`: Fetch tracking and delivery info.

### Support & Tasks
- `GET /api/v1/tickets`: List support tickets.
- `GET /api/v1/tickets/:id`: Fetch specific ticket and its messages.
- `POST /api/v1/tickets`: Create a new ticket.
- `GET /api/v1/tasks`: List operations tasks.
- `GET /api/v1/tasks/:id`: Fetch specific task.
- `POST /api/v1/tasks`: Create an operations task.
- `POST /api/v1/tasks/:id/assign`: Assign task.

### AI Conversations
- `GET /api/v1/conversations/:id`: Fetch conversation details.
- `GET /api/v1/conversations/:id/messages`: Fetch conversation history.
- `POST /api/v1/chat/invoke`: Submit a user query to the AI. Returns an SSE (`text/event-stream`) stream containing observable status events and the final response.
  - *Rule*: AI streaming may expose user-safe status events, tool execution status, and final responses, but never hidden chain-of-thought.

### Approval Management (Manager/Admin Only)
- `GET /api/v1/approvals`: List pending `ApprovalRequest`s.
- `GET /api/v1/approvals/:id`: Fetch specific approval request details.
- `POST /api/v1/approvals/:id/approve`: Approve an action (triggers backend execution).
- `POST /api/v1/approvals/:id/reject`: Reject an action.

---

## 5. Node.js → AI Service API

Node.js invokes the FastAPI service for all AI reasoning. Communication is secured via an internal service token (`X-Internal-Service-Token`). 

### AI Agent Invocation (SSE)
- **Endpoint**: `POST /internal/agent/invoke`
- **Purpose**: Normal agent execution triggered by a user message.
- **Payload**:
  ```json
  {
    "conversation_id": "uuid",
    "user_message": "Where is my order?",
    "principal_context": {
      "principal_type": "CUSTOMER",
      "principal_id": "uuid",
      "role": "CUSTOMER"
    },
    "correlation_id": "req-12345"
  }
  ```
  *(Note: For internal staff, `principal_type` is `"USER"`. Node uses this context for strict backend authorization).*
- **Response**: `text/event-stream` containing LangGraph events (e.g., status, tool invocation status, final response tokens).

### Asynchronous Agent Follow-Up
- **Endpoint**: `POST /internal/agent/follow_up`
- **Purpose**: Trigger a NEW agent invocation when an asynchronous business event occurs (e.g., a manager rejects an `ApprovalRequest`). 
- **Behavior**: 
  - It starts a NEW LangGraph execution.
  - It does NOT resume a previous in-memory LLM.
  - Node persists the approval result first.
  - FastAPI retrieves the required persisted conversation and business context.
  - The resulting AI message/state is persisted through Node.
- **Payload**:
  ```json
  {
    "conversation_id": "uuid",
    "event_type": "APPROVAL_REJECTED",
    "event_payload": {
      "approval_id": "uuid",
      "reason": "Out of policy window"
    },
    "correlation_id": "req-98765"
  }
  ```
- **Response**: Fast HTTP 202. 

*(Note: RAG and document retrieval are strictly internal to Python. Node.js does not invoke RAG directly; it relies on the Agent to query Qdrant internally during an invocation).*

---

## 6. AI Service → Node/MCP Tool Interface

The Python AI Service uses an MCP Client to request business data and actions from the Node MCP Server.

### Local Python Tools (NOT MCP)
- `search_knowledge`: A local Python/LangChain RAG retrieval tool querying Qdrant. **This is explicitly NOT an MCP tool and is not hosted by Node.**

### Node MCP Business Tools

**READ Tools** (Return business data):
- `get_customer`: Fetch customer profile.
- `get_order`: Fetch order status and details.
- `get_payment`: Fetch payment status.
- `get_shipment`: Fetch tracking and delivery info.
- `get_ticket`: Fetch a single support ticket.
- `search_tickets`: Search tickets by parameters.
- `list_tickets`: List active tickets by status.

**SAFE WRITE Tools** (Perform authorized, low-risk operational actions):
- `update_customer_contact`: Update email/phone.
- `create_ticket`: Open a new support ticket.
- `add_ticket_message`: Append a message (sender_type=AI) to a ticket.
- `escalate_ticket`: Increase ticket priority and unassign.
- `create_task`: Create an internal operations task.
- `assign_task`: Assign a task to an internal user.

**SENSITIVE WRITE Tools** (Create `ApprovalRequest`; DO NOT directly mutate financial/fulfillment state):
- `cancel_order`: Propose order cancellation.
- `request_refund`: Propose a monetary refund.

---

## 7. MCP Contract

The Node MCP Server exposes standard JSON-RPC based tool schemas.

**Tool Contract Example (Sensitive Write): `request_refund`**
- **Description**: Propose a refund for an order.
- **Input Schema**:
  ```json
  {
    "order_id": "uuid",
    "amount": "number",
    "reason": "string"
  }
  ```
- **Output Schema**:
  ```json
  {
    "status": "202 Accepted",
    "message": "Refund requires human approval. Approval request created.",
    "approval_id": "uuid"
  }
  ```
- **Authorization Requirements**: The MCP request must include the trusted `principal_context` passed down from the initial FastAPI invocation. Node evaluates if the requested action is permitted for that context.
- **Business Validation**: Before creating an `ApprovalRequest` for a sensitive action, Node must perform deterministic business validation (e.g., order exists, principal is authorized, requested amount is valid, refund eligibility rules are satisfied, no conflicting pending request exists). RAG/prompt reasoning must NOT override these deterministic rules (e.g., RAG answers "What does the policy say?", while Node Business rules enforce "Is this specific order eligible?").
- **Execution Mechanism**: Creates an `ApprovalRequest` with status `PENDING`. It **does not** connect to a payment gateway or alter the Payment status.

**Tool Contract Example (Read): `get_order`**
- **Description**: Retrieve order details.
- **Input Schema**: `{ "order_id": "string" }`
- **Output Schema**: Full order JSON object.
- **Execution Mechanism**: MCP Server invokes the appropriate Node business service, which accesses PostgreSQL through the repository layer.

---

## 8. Authentication and Authorization

- **Frontend Authentication**: Frontend authentication uses the application's selected secure HTTP-only authentication mechanism. The exact JWT vs session implementation is finalized in `SECURITY.md`. Node serves as the authentication gateway.
- **Backend Authorization (RBAC)**: Node.js serves as the absolute authorization authority. It enforces roles (`CUSTOMER`, `SUPPORT_AGENT`, `SUPPORT_MANAGER`, `OPERATIONS`, `ADMIN`) on all API endpoints.
- **Service-to-Service Authentication**: Node.js passes an `X-Internal-Service-Token` when calling FastAPI. The AI service rejects unauthenticated requests.
- **AI Tool Authorization**: The original principal context is propagated from Node to FastAPI, and subsequently passed into every MCP tool call. The Node MCP Server applies standard business authorization rules to that context. **MCP is a transport interface, not an authorization mechanism.**

---

## 9. Error Contracts (Public API)

Public API responses should use stable application-level error codes rather than exposing infrastructure details (e.g., do not expose "Qdrant is down" directly to the browser). Internal logs may contain detailed dependency errors.

**Application-Level Codes:**
- `AI_UNAVAILABLE`
- `AI_TIMEOUT`
- `VALIDATION_FAILED`
- `FORBIDDEN`
- `NOT_FOUND`
- `APPROVAL_REQUIRED`
- `APPROVAL_EXPIRED`

Example format:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The requested amount exceeds the original payment."
  },
  "correlation_id": "req-12345"
}
```

---

## 10. Timeout / Retry Behavior

The following timeout values are configurable runtime settings (not immutable architectural requirements), configured with reasonable MVP defaults:
- **First AI stream event**: ~10 seconds.
- **Agent run completion**: ~30 seconds.
- **MCP tool call**: ~5 seconds.

**Retry Logic**: Writes (safe or sensitive) must NOT be automatically retried by the network layer.

---

## 11. Idempotency Requirements

Mutating REST operations and corresponding mutating MCP tool operations must utilize unique keys to prevent duplication:

- **REST mutating operations**: `Idempotency-Key: <unique key>` HTTP header.
- **MCP mutating tools**: `idempotency_key: <unique key>` as part of the tool input schema. (Do not imply that MCP tool calls use HTTP headers).

**Behavior**:
- Same key + same operation/payload → Return the original result.
- Same key + conflicting operation/payload → Reject as an idempotency conflict.

This strictly applies to mutating operations such as `create_ticket`, `create_task`, `assign_task`, `request_refund`, and `cancel_order`.

---

## 12. Approval Execution Contract

When a manager acts on a pending sensitive action, the following flow is strictly enforced at the `POST /api/v1/approvals/:id/approve` endpoint:

1. **Manager approves** via the frontend.
2. **Node verifies**:
   - `ApprovalRequest` exists.
   - Status is `PENDING`.
   - Expiration threshold has not been reached.
   - Reviewer has valid authorization (`SUPPORT_MANAGER` or `ADMIN`).
3. **Node executes** the *exact* action persisted in the `ApprovalRequest`. **IMPORTANT**: The `/approve` request must NOT allow the frontend to change the requested action, target entity, amount, or business parameters. The persisted `ApprovalRequest` is the absolute source of truth.
4. **Business transaction** succeeds or fails in PostgreSQL.
5. **State transition**: `ApprovalRequest` becomes `EXECUTED` or `FAILED`.
6. **Audit trail**: `AuditEvent` is recorded.
7. **Follow-up**: Node triggers an optional new AI invocation (`POST /internal/agent/follow_up`) to handle customer messaging.

---

## 13. Audit / Correlation Requirements

- A single `correlation_id` (generated by Node) is passed to:
  1. The Node API controller.
  2. The FastAPI `/internal/agent/invoke` request.
  3. Every MCP tool call made back to Node during that agent run.
- The Node.js backend maintains the append-only `AuditEvent` table, recording tool invocations, sanitized inputs, and results.

---

## 14. Representative Request / Response Contracts

**A. AI Agent Invocation (Node to FastAPI SSE)**
- `POST /internal/agent/invoke`
- Response: `200 OK` `text/event-stream`
  ```text
  data: {"event": "status", "code": "CHECKING_ORDER"}
  data: {"event": "tool_call", "tool": "get_order"}
  data: {"event": "status", "code": "CHECKING_REFUND_ELIGIBILITY"}
  data: {"event": "message", "content": "Your order is currently out for delivery."}
  ```

**B. Refund Request Tool (FastAPI MCP Client to Node MCP Server)**
- Request: `mcp.call_tool("request_refund", { "order_id": "uuid", "amount": 49.99, "idempotency_key": "req-12345" })`
- Response: `{ "status": 202, "message": "Pending approval", "approval_id": "uuid" }`

---

## 15. Security Constraints

- **No Passwords**: Authentication payloads must never be passed to the LLM context or written to `AuditEvent`.
- **No Payment Card Data**: Raw PANs or CVVs are strictly out of scope.
- **PII Redaction**: Node.js must sanitize outputs from MCP tools before returning data to the AI agent.
- **No Direct DB Credentials**: The Python AI service does not have PostgreSQL credentials.
- **Approval Enforcement**: Node.js absolutely refuses to execute `cancel_order` or `request_refund` backend logic unless an `APPROVED` `ApprovalRequest` entity exists in PostgreSQL.
- **Expiration Threshold**: An `ApprovalRequest` may expire when the configured approval expiration threshold is reached.

---

## 16. Versioning Strategy

- Node REST API: URL path versioning (e.g., `/api/v1/tickets`).
- Internal APIs (FastAPI and MCP): Unversioned for MVP. Breaking changes require coordinated deployment of both Node and Python containers.

---

## 17. Out-of-Scope API Behavior

- Creating generic CRUD tools for every single database table.
- GraphQL endpoints.
- Real-time WebSockets (SSE is used exclusively for one-way AI streaming).
- Handling real payment gateway callbacks (Stripe/PayPal webhooks). 

---

*End of Document*
