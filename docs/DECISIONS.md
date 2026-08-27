# Decisions

*Status: Pending Definition*

Architecture Decision Records (ADRs).

## ADR 001: CUSTOMER as a Principal Type, NOT an RBAC Role

- **Context**: The `API_CONTRACT.md` listed `CUSTOMER` under the Node.js RBAC roles alongside `ADMIN`, `SUPPORT_AGENT`, etc. However, `DATA_MODEL.md` explicitly required keeping `CUSTOMER` separate from the internal `roles` enum. Furthermore, the `customers` database entity has no `password_hash` column.
- **Decision**: 
  1. `CUSTOMER` is treated conceptually as a `principal_type` for future authentication scenarios, NOT as an internal PostgreSQL RBAC `role_name`.
  2. The formal internal RBAC role model remains exactly: `ADMIN`, `SUPPORT_AGENT`, `SUPPORT_MANAGER`, `OPERATIONS`.
  3. `POST /api/v1/auth/login` is strictly for internal users. Customer authentication is deferred to a future phase and explicitly requires a new security design before implementation. No database schema changes were made.
- **Status**: Approved during Phase 3.1 & 3.2.

## ADR 002: Strict Separation of Authorization Concerns

- **Context**: Authorization needed to be established for the application. AI output is untrusted and must never be treated as an authorization authority.
- **Decision**: 
  1. Authorization is decoupled into four explicit layers: Authentication (who), RBAC (role permission), Resource Authorization (ownership/assignment scope), and Business Validation (deterministic invariants like PENDING state).
  2. `CUSTOMER` is explicitly omitted from the RBAC policy map (`backend/src/policies/rbacPolicy.js`). It triggers Resource Authorization (e.g. `customer_id === principal_id`) independently of role permissions.
  3. The `ADMIN` wildcard permission `*` strictly applies only to RBAC evaluation. It does NOT bypass Resource Authorization or determinable Business Validation (e.g., an ADMIN cannot approve an `EXPIRED` approval).
  4. The AI Service is entirely excluded from the authorization chain. The final decision is calculated exclusively by Node.js, ensuring future MCP integrations remain secure.
- **Status**: Approved during Phase 3.3 & 3.4.

## ADR 003: Idempotency Persistence for REST Mutations

- **Context**: The `API_CONTRACT.md` (Section 11) explicitly mandates idempotency using an `Idempotency-Key` header for mutating REST operations, starting with `POST /api/v1/tickets`. However, the original PostgreSQL schema (`schema.sql`) lacked any mechanism to enforce or persist this requirement.
- **Decision**: 
  1. Add a minimal, purpose-built `idempotency_keys` table to PostgreSQL.
  2. The table maps `idempotency_key` + `operation` (UNIQUE) to a `request_fingerprint`, `response_status`, and `response_body` (JSONB) to safely replay original results.
  3. No existing business entity tables (e.g., `audit_events`, `support_tickets`) will be conflated with infrastructure-supporting idempotency states.
  4. Ticket creation and idempotency recording will execute within a single transactional boundary to ensure state correctness.
- **Status**: Approved during Phase 4.5.

## ADR 004: Deferral of Operations Task Mutations

- **Context**: Phase 4.6 (Operations API) requires implementing `POST /api/v1/tasks` and `POST /api/v1/tasks/:id/assign` as per the frozen API contract. However, the existing PostgreSQL schema contains `creator_type` but no `creator_id` column to identify the task creator. Additionally, the contract does not formally define task assignment cardinality rules (e.g. single versus multi-assignment, history preservation requirements, re-assignments). 
- **Decision**: Task mutations (`POST /api/v1/tasks` and `POST /api/v1/tasks/:id/assign`) are explicitly deferred until their business semantics are formally approved and the creator identity model is added to the architecture. The Phase 4.6 implementation will contain the safe read-only surface (`GET /api/v1/tasks`, `GET /api/v1/tasks/:id`) only.
- **Consequences**: 
  1. The existing `tasks` schema remains fully unmodified.
  2. No new business rules regarding assignments are invented prematurely.
  3. Operations mutations remain unimplemented until future phases approve architectural updates.
- **Status**: Approved during Phase 4.6.

## ADR 005: Transaction Propagation for Audited Mutations

- **Context**: Phase 4.7 (Audit System) requires that critical business mutations (e.g. ticket creation) and their corresponding business audit events are persisted atomically. The existing architecture isolated transactions inside specific repositories, preventing them from wrapping multiple operations across different domains.
- **Decision**: Introduce optional transaction propagation using a shared PostgreSQL client. The Service layer becomes responsible for owning the transaction boundary (`BEGIN`, `COMMIT`, `ROLLBACK`) via a lightweight `withTransaction` helper. Repositories accept this shared `client` parameter and bypass their internal transaction management when it is provided.
- **Consequences**:
  1. Business mutations and audit events succeed or fail entirely together.
  2. Strict isolation of concerns is preserved (Controller -> Service -> Audit Service -> Repository).
  3. No new external infrastructure (e.g., Redis, event buses) or heavy ORMs are required.
- **Status**: Approved during Phase 4.7.

## ADR 006: Explicit Session and Logout Endpoints

- **Context**: The frontend requires a server-validated current-session endpoint because authentication uses an HTTP-only JWT cookie that cannot be read by browser JavaScript. A logout endpoint is also required because browser JavaScript cannot directly clear an HTTP-only authentication cookie.
- **Decision**: 
  1. Implemented `GET /api/v1/auth/session` to return the `req.principal` when an authenticated session exists.
  2. Implemented `POST /api/v1/auth/logout` to explicitly expire the HTTP-only cookie.
  3. No database-backed sessions, refresh tokens, or alternate identity structures were introduced.
- **Status**: Approved during Phase 5.2.
