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

## 4.2 — Product & Catalog APIs
**Status: COMPLETE**

- **Implemented Catalog Endpoints**: Established read-only `GET /api/v1/products` and `GET /api/v1/product-categories` with associated `/:id` detail endpoints.
- **Enforced Security Mechanisms**:
  - Validated UUIDs and query parameters directly at the HTTP boundary.
  - Enforced `requireAuthentication` so that only verified `CUSTOMER` and `USER` principals can view catalog resources, while treating the catalog as globally readable to any authenticated user.
  - Omitted inactive catalog items (`active = false`) via parameterized PostgreSQL queries to protect discontinued data from leaking.
- **Verification Performed**: `test_product_api.js` was created and successfully passed local E2E verifications against `shopsphere_dev`, proving authentication middleware enforcement, filter capabilities (`?category_id=`), pagination constraints, and boundary protections. No unauthorized CRUD endpoints or schema modifications were introduced.

## 4.3 — Order APIs
**Status: COMPLETE**

- **Implemented Order Endpoints**: Established read-only `GET /api/v1/orders` and `GET /api/v1/orders/:id` capturing the complete Order domain (order items, historical unit pricing, safe payment details, safe shipment details).
- **Enforced Security Mechanisms**:
  - Maintained the Phase 3 authorization framework: CUSTOMER order listing ownership is rigidly filtered via parameterized database queries. 
  - Overriding `?customer_id=` query parameters by customers is correctly ignored.
  - Granular detail view (`/:id`) leverages `resourcePolicy.js` explicitly before fetching data.
  - Sensitive internal state and external credentials (like passwords, card PANs) are cleanly isolated from the response JSON shapes.
  - Internal users require the exact `order.read` RBAC entitlement. 
- **Verification Performed**: `test_order_api.js` was created and dynamically executed against seeded deterministic records, confirming paginations, filters, boundary isolation (Customer A cannot see Customer B), and security constraints. Full Phase 3 and Phase 4.1/4.2 regression sweeps were also executed and passed. No architecture drift was introduced, and no Order mutations were built, preserving the API contract bounds.

## 4.4 — Shipment APIs
**Status: COMPLETE**

- **Implemented Shipment Endpoints**: Established a read-only `GET /api/v1/shipments/:id` API that securely exposes operational tracking data (`carrier`, `tracking_number`, `status`, `estimated_delivery`).
- **Enforced Security Mechanisms**:
  - `canAccessShipment(principal, shipmentId)` was added to `resourcePolicy.js`, correctly enforcing customer authorization boundaries by routing through the `shipments -> orders -> customers` table relationships. Customers can only retrieve tracking details if they own the parent Order.
  - No shipment mutation functions (update, transition, scrape, create) were added.
  - The API exposes safe operational fields, blocking the creation of external API polling workflows and preserving strict boundary control.
- **Verification Performed**: `test_shipment_api.js` was built and passed E2E validations ensuring non-owners face `403 Forbidden` responses. Full regression suites covering Authorization, Products, Customers, and Orders passed flawlessly. No schema modifications, redundant models, or ORMs were utilized.

## 4.5 — Ticket APIs
**Status: COMPLETE**

- **Implemented Ticket Endpoints**: Established `GET /api/v1/tickets`, `GET /api/v1/tickets/:id`, and `POST /api/v1/tickets` for minimal, contract-approved support ticket operations.
- **Architectural Decision (ADR 003)**: Added a minimal, purpose-built `idempotency_keys` table to PostgreSQL to persist idempotency keys required for mutating REST operations, fulfilling API_CONTRACT.md section 11 requirements.
- **Enforced Security Mechanisms**:
  - `POST /api/v1/tickets` strictly requires an `Idempotency-Key` header and enforces exactly-once transaction processing mapped directly to PostgreSQL uniqueness limits.
  - Fingerprinted request payloads to safely reject `409 Conflict` variations using the same idempotency key.
  - Authorized customer boundaries are strictly verified before creation. e.g. An associated `order_id` is validated as belonging to the principal `customer_id`.
  - Collision-resistant business ID (`TKT-<random>`) is generated locally inside the creation transaction without new independent services.
- **Verification Performed**: Designed `test_ticket_api.js` which demonstrated complete isolation for customers (403 for cross-customer read), proper 201 idempotency deduplication with 409 conflict detection, and robust pagination/filtering. Full regression suites covering Authorization, Products, Customers, Orders, and Shipments passed flawlessly. No helpdesk platform functionality, AI features, or unauthorized update endpoints were introduced.

## 4.6 — Operations APIs (Read-Only)
**Status: COMPLETE — READ-ONLY**

- **Implemented Task Endpoints**: Established `GET /api/v1/tasks` and `GET /api/v1/tasks/:id` for safe task exploration by internal staff.
- **Deferred Mutations**: `POST /api/v1/tasks` and `POST /api/v1/tasks/:id/assign` have been explicitly deferred. The existing data model does not clearly represent creator identity (`creator_id` is missing) and task assignment semantics (e.g. multi-assignment limits) are not yet formally defined. 
- **Architectural Decision (ADR 004)**: Recorded the deferral of task mutation operations to preserve the existing database schema and avoid prematurely inventing assignment rules.
- **Enforced Security Mechanisms**: 
  - CUSTOMER principals are completely blocked from accessing operations APIs via rigorous `rbacPolicy` mapping.
  - SUPPORT_AGENT boundaries are correctly filtered using the existing `task_assignments` relationships to verify active assignments.
  - Safe data hydration returns robust pagination (`page`, `limit`) and strict enum validation (`task_status`, `task_priority`) directly at the HTTP boundary.
- **Verification Performed**: `test_task_api.js` was built and passed E2E validations demonstrating unauthenticated blocks, role-spoofing rejection, filters, pagination, and RBAC boundaries. Full regression suites successfully passed across Phases 3, 4.1, 4.2, 4.3, 4.4, and 4.5.

## 4.7 — Audit System
**Status: COMPLETE**

- **Centralized Business Audit**: Implemented a secure, append-only audit trail persisting to the PostgreSQL `audit_events` table for critical business mutations.
- **Transaction Propagation (ADR 005)**: Adopted a transaction propagation model via `withTransaction` where the Service layer owns the transactional boundary. This mathematically guarantees that business mutations and their corresponding audit events succeed or rollback entirely atomically.
- **Ticket Creation Integrated**: The `POST /api/v1/tickets` mutation now automatically records a `TKT_CREATED` audit event containing the request ID, actor info, and sanitized input.
- **Enforced Security Mechanisms**: 
  - **Actor Integrity**: Audit actor identities are strictly derived from the trusted Node `req.principal`, rendering role-spoofing attempts via request bodies or HTTP headers entirely ineffective.
  - **Strict Sanitization**: Sentitive fields (`password`, `jwt`, `cookie`, `card`, `pan`, etc.) are aggressively redacted directly at the `auditService` layer before persistence.
  - **Append-Only Isolation**: No update, delete, or public read endpoints exist for the audit log to preserve tamper resistance.
- **Verification Performed**: Designed `test_audit_system.js` proving transactional atomicity (forcing an artificial audit failure successfully triggered a ticket rollback), verifying actor extraction, validating payload sanitization, and protecting idempotency behaviors. All Phase 1-4 regressions continue to pass flawlessly.

## 5.1 — React Shell
**Status: COMPLETE**

- **Implemented React Shell**: Initialized and configured the fundamental React + Vite application shell within the `frontend` directory. Preserved the existing repository structure without introducing conflicting architectures.
- **Tailwind CSS Configuration**: Configured `@tailwindcss/vite` (Tailwind v4) and verified successful processing of styling classes on a minimal ShopSphere AI component.
- **Enforced Dependencies**: Adhered strictly to minimal requirements. No unnecessary routers, state managers, API clients, or UI component libraries were introduced.
- **Architecture Maintained**: The shell is isolated from backend implementation. No database credentials, backend secrets, or environment variables were exposed. Node.js backend remains untouched and authoritative. No authentication architecture was prematurely introduced into the frontend.
- **Verification Performed**:
  - `npm install`: PASS
  - Development server (`vite`): PASS
  - Tailwind pipeline and React rendering: PASS
  - Production build (`vite build`): PASS
  - Backend regression tests (`npm test`): NOT RUN (No tests specified, but no backend files were modified).
