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
