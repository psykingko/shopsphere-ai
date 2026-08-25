# Changelog

*Status: Living / Active*

Record of key changes in the ShopSphere AI project.

## Completed Milestones

1. Phase 0 — Governance & Architecture — COMPLETE
2. FOUNDATION-001 — Project Structure & Environment — COMPLETE
3. FOUNDATION-002 — Backend Shell — COMPLETE
4. FOUNDATION-003 — AI Service Shell — COMPLETE
5. Phase 2.1 — PostgreSQL Setup & Database Foundation — COMPLETE

## 2.2 — PostgreSQL Schema
**Status: COMPLETE**

- **Implemented Approved PostgreSQL Schema**: Successfully translated the approved `DATA_MODEL.md` into physical PostgreSQL structures. No ORM or migration framework was introduced; raw SQL was utilized via `pg`.
- **Entities Implemented**: `roles`, `users`, `customers`, `customer_addresses`, `product_categories`, `products`, `orders`, `order_items`, `payments`, `shipments`, `support_tickets`, `ticket_messages`, `tasks`, `task_assignments`, `approval_requests`, `workflows`, `workflow_executions`, `audit_events`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunk_metadata`, `ai_conversations`, `ai_messages`.
- **Existing Structures Reused**: None. The `shopsphere_dev` database was physically empty prior to initialization. 
- **Important Schema Components Created**: 
  - Strict ENUMs (`role_name`, `order_status`, `payment_status`, etc.) to prevent sprawling status logic.
  - Foreign key and primary key constraints across all relationships. 
  - Omitted `IF NOT EXISTS` to ensure strict mismatch detection.
  - Omitted `created_at` or `deleted_at` fields where the data model didn't explicitly define them.
- **Verification Performed**: 
  - PostgreSQL connection: PASS
  - Schema existence, Tables, Columns, Primary keys, Foreign keys, Constraints: PASS (Verified physically using standard metadata queries).
  - Duplicate audit: PASS
  - Architecture audit: PASS
- **Architectural / Security Outcome**: The `shopsphere_dev` database schema was established while strictly adhering to boundaries: Node.js maintains sole access. Python AI service maintains zero access to PostgreSQL. No unauthorized Qdrant implementation or architecture drifted into this sub-phase.

## 2.3 — Seed Synthetic Data
**Status: COMPLETE**

- **Implemented Deterministic Seeder**: Created `backend/scripts/seed_data.js` capable of generating a completely deterministic, referentially intact dataset. Used a custom JavaScript Mulberry32 PRNG and a custom UUID v4 formatter to avoid external dependencies like Faker or ORMs.
- **Verification Performed**:
  - Deterministic reproducibility confirmed via physical DB reset, re-seed, and matching SHA-256 dataset fingerprints.
  - Foreign Key constraints, Unique constraints, NOT NULL constraints verified manually via `backend/scripts/verify_seed.js`.
  - Monetary consistency (`total_amount == sum(items)`) verified for 3000 synthesized orders.
- **Architecture Maintained**: No RAG, embeddings, Python scripts, Qdrant DBs, or external services were integrated. Strictly Node.js to PostgreSQL insertions.

## 3.1 & 3.2 — Authentication & Principal Context
**Status: COMPLETE**

- **Implemented Authentication Gateway**: Established `POST /api/v1/auth/login` within Node.js to strictly authenticate internal staff via `bcrypt` validation against the `users` table.
- **Architectural Decision (ADR 001)**: Explicitly designated `CUSTOMER` as a principal type rather than a PostgreSQL RBAC role, deferring customer authentication and avoiding unauthorized schema modifications. 
- **Established Principal Context**: Issued securely signed JWTs representing immutable Principal metadata (`principal_type`, `principal_id`, `role`).
- **Enforced Security Mechanisms**: Tokens are securely returned via an HTTP-only `Set-Cookie` header to mitigate client-side intercept vectors, aligning exactly with the authorized architecture.
- **Verification Performed**: Fully tested endpoint connectivity, unauthenticated rejection, successful session cookie generation, and the middleware mapping of the principal onto the request context without client override.

## 3.3 & 3.4 — RBAC & Resource Authorization
**Status: COMPLETE**

- **Implemented Four-Layer Authorization Architecture**: Separated authorization concerns into Authentication, Role-Based Access Control (RBAC), Resource Authorization, and Business Validation to strictly secure the Node.js backend boundary.
- **Architectural Decision (ADR 002)**: Formalized the separation of concerns, explicitly defining that `CUSTOMER` acts only as a principal type for resource ownership, not an RBAC role. `ADMIN` roles do not bypass deterministic business validation.
- **Enforced Security Mechanisms**: 
  - `requirePermission` middleware checks RBAC statically against the frozen role matrix.
  - Client-controlled values (`req.body.role`, `req.headers`) are categorically ignored in favor of the trusted `req.principal`.
  - Node.js retains exclusive authorization authority. The AI Service and frontend cannot make authorization decisions.
- **Verification Performed**: Auth suite (`test_authorization.js`) successfully confirmed `401/403` boundaries, spoofing immunity, customer ownership rules, assignment scope limits, and deterministic validation of expired approvals even against `ADMIN` roles. No unauthorized schemas or databases were introduced.

## 4.1 — Customer APIs
**Status: COMPLETE**

- **Implemented Customer Endpoint**: Established `GET /api/v1/customers/:id` for retrieving customer profiles, integrating fully with the existing PostgreSQL database and Phase 3 authorization infrastructure.
- **Enforced Security Mechanisms**:
  - Validated UUIDs to reject malformed inputs before processing.
  - Successfully permitted authorized `CUSTOMER` principals to access their own records while blocking access to others' records.
  - Allowed authorized internal staff (`USER`) with `customer.read` access via RBAC to view the profiles.
  - Preserved the centralized error-handling flow (400, 401, 403, 404, 500) ensuring database/internal stack trace details are not leaked.
  - Soft-deleted entities are correctly filtered out via `deleted_at IS NULL`.
- **Verification Performed**: `test_customer_api.js` was created and successfully passed local E2E verifications against `shopsphere_dev`, proving authentication middleware, correct domain object assembly (including addresses), and boundary protections.

## 4.2 — Product APIs
**Status: DEFERRED**

- **Gap Identified**: Inspected the frozen `API_CONTRACT.md`, `FEATURES.md`, and `DATA_MODEL.md`. No product/catalog REST endpoints were defined for the Frontend → Node.js boundary. 
- **Architectural Decision**: Following the strict rule against inventing unsupported scope or endpoints, Product API creation was skipped and deliberately deferred until product capabilities are explicitly defined and formally added to the API contract.
