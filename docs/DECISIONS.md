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
