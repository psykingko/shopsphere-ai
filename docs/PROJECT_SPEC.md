# 1. Product Overview

ShopSphere AI is a local-first, zero-cost AI Business Operations and Customer Support Platform designed for a fictional e-commerce company. 

It solves the operational challenge of managing high-volume customer support and internal workflows without compromising on security, privacy, or architectural cleanliness. The platform allows customers to self-serve through an AI assistant, while enabling human support agents, managers, and operations staff to manage tickets, internal knowledge, and business workflows. 

The AI acts as an intelligent orchestrator: it understands natural language requests, retrieves authoritative company knowledge, inspects relevant operational data (like orders or payments), and can execute or propose business actions through authorized tools. It does all of this safely, enforcing a human-in-the-loop mechanism for sensitive actions.

Ultimately, the product is useful because it bridges the gap between raw LLM capabilities and secure, predictable business execution, serving as a comprehensive demonstration of modern AI engineering.

# 2. Product Goals

**Customer-Support Automation**
- Automate resolution for routine customer queries (e.g., order tracking, policy questions).
- Triage, classify, and intelligently route complex issues to human agents.

**Company Knowledge Access**
- Provide immediate, grounded answers to internal policy and operational questions based strictly on indexed company documents.

**Business Operations Automation**
- Empower staff to query operational data (e.g., unresolved high-priority tickets) and execute tasks via natural language.

**Workflow Automation**
- Trigger deterministic business processes (e.g., automatic escalation tasks) based on specific conditions and states.

**AI Safety/Auditability**
- Ensure the AI never accesses the database directly or bypasses authorization.
- Require explicit human approval for sensitive actions (e.g., processing refunds).
- Maintain an append-only audit log of every AI action, tool invocation, and human approval. The application must provide no normal update/delete operations for audit entries.

# 3. Users and Roles

- **CUSTOMER**: External users who interact with the support AI to resolve order, product, or policy inquiries.
- **SUPPORT_AGENT**: Staff responsible for reviewing and resolving escalated tickets, communicating with customers, and utilizing the knowledge base.
- **SUPPORT_MANAGER**: Supervisors who oversee support queues, handle escalations, and review/approve sensitive AI-proposed actions (e.g., refunds).
- **OPERATIONS**: Internal staff focused on backend workflows, task execution, logistics tracking, and operational efficiency.
- **ADMIN**: System administrators responsible for platform configuration, user role management, and system-wide observability.

# 4. Core Functional Modules

## 4.1 Authentication & User Management
- **Purpose**: Authenticate users and enforce role-based access control.
- **Primary Users**: Admin, All roles.
- **Main Actions**: Login, manage roles.
- **Expected Outputs**: Secure session tokens.
- **Business Rules**: AI requests must be strictly bound to the authenticated user's permissions.

## 4.2 Customer Management
- **Purpose**: Maintain external user profiles and history.
- **Primary Users**: Support Agent, Support Manager.
- **Main Actions**: View customer details, update contact information.
- **Expected Outputs**: Customer profiles and interaction history.

## 4.3 Product Management
- **Purpose**: Manage the e-commerce catalog.
- **Primary Users**: Operations.
- **Main Actions**: View product details.
- **Expected Outputs**: Product catalogs, specifications.

## 4.4 Order Management
- **Purpose**: Track customer purchases.
- **Primary Users**: Customer, Support Agent, AI.
- **Main Actions**: View order status, cancel orders.
- **Expected Outputs**: Order timelines, fulfillment status.
- **Business Rules**: Orders can only be cancelled if they haven't shipped.

## 4.5 Payment Management
- **Purpose**: Track transactions and refunds.
- **Primary Users**: Support Manager, Operations.
- **Main Actions**: View payment status, process refunds.
- **Expected Outputs**: Transaction logs.
- **Business Rules**: Refunds require manager approval.

## 4.6 Shipment Management
- **Purpose**: Track physical delivery of orders.
- **Primary Users**: Customer, Support Agent.
- **Main Actions**: Track shipment, report missing delivery.
- **Expected Outputs**: Carrier status, tracking IDs.

## 4.7 Customer Support / Tickets
- **Purpose**: Centralized tracking for customer issues.
- **Primary Users**: Customer, Support Agent, Support Manager.
- **Main Actions**: Create ticket, reply, close, escalate.
- **Expected Outputs**: Threaded ticket conversations.

## 4.8 Knowledge Base
- **Purpose**: Maintain the company's source of truth policies.
- **Primary Users**: Support Agent, AI.
- **Main Actions**: Search documents, read SOPs.
- **Expected Outputs**: Grounded policy explanations.

## 4.9 AI Support Resolution
- **Purpose**: The interactive AI interface for resolving queries.
- **Primary Users**: Customer, Support Agent.
- **Main Actions**: Ask questions, request actions.
- **Expected Outputs**: AI generated responses, action proposals.

## 4.10 Tasks
- **Purpose**: Manage internal operational work.
- **Primary Users**: Operations, Support Manager.
- **Main Actions**: Create task, assign task, complete task.
- **Expected Outputs**: Task queues.

## 4.11 Workflow Automation
- **Purpose**: Automate deterministic background processes.
- **Primary Users**: Operations, Admin.
- **Main Actions**: Define triggers and actions.
- **Expected Outputs**: Automated task generation or status updates.

## 4.12 Human Approval
- **Purpose**: Guardrail for sensitive AI actions.
- **Primary Users**: Support Manager.
- **Main Actions**: Review proposed AI action, approve, reject.
- **Expected Outputs**: Executed action or rejection feedback loop.

## 4.13 Audit / AI Activity
- **Purpose**: Track all AI tool usage and decisions.
- **Primary Users**: Admin, Support Manager.
- **Main Actions**: View logs, trace agent actions and decision rationale.
- **Expected Outputs**: Append-only audit trails.

## 4.14 Administration
- **Purpose**: High-level platform monitoring.
- **Primary Users**: Admin.
- **Main Actions**: System configuration, view metrics.

# 5. AI Capabilities

The AI orchestrates multi-step reasoning by retrieving knowledge, inspecting business data, and executing tools. It distinguishes actions into three strict categories:

### Informational AI actions
The AI retrieves and explains information without altering state.
- Intent classification & ticket categorization.
- Priority classification.
- Knowledge retrieval (RAG).
- Customer, order, and payment lookups.
- Formulating grounded responses.

### Safe operational actions
The AI can perform predefined low-risk actions automatically.
- Creating a support ticket.
- Creating an internal operational task.
- Assigning a task or escalating a ticket based on standard rules.

### Sensitive actions
The AI can propose the action, but approval is strictly required before execution.
- Canceling an order.
- Processing a refund.
- Modifying customer profiles.

### Operations Agent Capability
An explicit, small, and focused Operations Agent is responsible for internal business operations:
- Inspecting operational data.
- Identifying operational work.
- Creating tasks.
- Assigning tasks.
- Escalating issues.
- Participating in deterministic workflows.

# 6. Customer Support User Flows

**1. Order status question**
Input: "Where is my order?"
→ AI understanding: Order tracking inquiry.
→ Required info: Order ID, customer context.
→ Tool actions: `get_order`, `get_shipment`.
→ Decision: Informational only.
→ Approval: None.
→ Final output: Formatted response detailing shipment status.

**2. Refund question**
Input: "My item is broken, I want a refund."
→ AI understanding: Refund request.
→ Required info: Order status, Return Policy via RAG.
→ Tool actions: `search_knowledge`, `get_order`.
→ Decision: Propose sensitive action (`request_refund`).
→ Approval: **Required** (Support Manager).
→ Final output: AI informs customer the refund request is pending manager review.

**3. Duplicate payment complaint**
Input: "I was charged twice for order 123."
→ AI understanding: Payment anomaly.
→ Required info: Payment records.
→ Tool actions: `get_payment`.
→ Decision: Escalate to human agent / Propose refund.
→ Approval: **Required** if refund proposed.
→ Final output: Ticket escalated or refund pending approval.

**4. Return request**
Input: "How do I return this shirt?"
→ AI understanding: Policy inquiry.
→ Required info: Return policy.
→ Tool actions: `search_knowledge`.
→ Decision: Informational.
→ Approval: None.
→ Final output: Explanation of return steps based on policy.

**5. Cancel-order request**
Input: "Please cancel my order."
→ AI understanding: Order cancellation.
→ Required info: Order status (has it shipped?).
→ Tool actions: `get_order`.
→ Decision: If unshipped, propose `cancel_order`.
→ Approval: **Required**.
→ Final output: Cancellation request sent to queue for approval.

**6. Policy question**
Input: "Do you ship internationally?"
→ AI understanding: General inquiry.
→ Required info: Shipping policy.
→ Tool actions: `search_knowledge`.
→ Decision: Informational.
→ Approval: None.
→ Final output: Answer generated from knowledge base.

**7. Escalation scenario**
Input: "I've been waiting 3 weeks and nobody is helping me!"
→ AI understanding: Recognizes user frustration as part of normal agent classification.
→ Required info: Ticket history.
→ Tool actions: `get_ticket`, `escalate_ticket`.
→ Decision: Safe operational action.
→ Approval: None.
→ Final output: AI escalates ticket to Support Manager and apologizes.

# 7. Company Knowledge User Flows

**Employee asks about refund policy**
- AI queries Qdrant for "refund policy", synthesizes the specific chunk, cites the source, and answers.

**Employee asks about escalation policy**
- AI retrieves SOP documents and outlines the step-by-step escalation matrix.

**Employee asks an unsupported question ("Who is our CEO?")**
- If the knowledge base does not contain the answer, the AI must explicitly state: "I cannot find information regarding this in the company knowledge base." It must not hallucinate or rely on pre-trained parametric knowledge.

# 8. Business Operations User Flows

**Create Task**: Manager says "Create a task for the warehouse to check stock for SKU-99." AI extracts details and executes `create_task`.
**Assign Task**: "Assign the warehouse task to Rahul." AI executes `assign_task`.
**Inspect Workload**: "Show me unresolved high-priority tickets." AI executes `get_tickets` filtered by priority and status, summarizing the list.

# 9. Workflow Automation

Workflows represent deterministic business rules outside of agentic LLM reasoning.

**Example 1: VIP Escalation**
- Trigger: Ticket created.
- Condition: Customer segment == VIP.
- Action: Update priority to HIGH, assign to Support Manager.
- Execution: Backend engine updates DB.
- Result: Manager is immediately notified.

**Example 2: Stale Ticket Warning**
- Trigger: Ticket status == OPEN for 48 hours.
- Condition: No agent reply.
- Action: Add "SLA-Breach" tag, create warning task.
- Execution: Backend engine updates DB.
- Result: Task appears in Operations queue.

**Example 3: Refund Approved Notification**
- Trigger: Refund request approved.
- Condition: Status changes to APPROVED.
- Action: Send automated resolution via simulated/internal notification mechanism and close ticket.
- Execution: Backend engine executes notification and DB update.
- Result: Ticket resolved.

# 10. Human-in-the-Loop

- **Which actions require approval:** Any action that modifies financial data (refunds) or permanent order states (cancellations).
- **Who can approve:** Users with the `SUPPORT_MANAGER` or `ADMIN` role.
- **Reviewer view:** The UI must NOT claim to expose hidden chain-of-thought. Instead, the reviewer sees:
  - proposed action
  - reason / decision rationale
  - relevant policy / source
  - affected entity
  - risk level
  - approval requirement
- **Approve behavior:** The backend executes the tool via standard API endpoints and records the audit log. The ticket state advances.
- **Reject behavior:** The backend cancels the proposal. The AI is informed of the rejection and prompts the customer/user with an alternative path.
- **Expired/stale behavior:** Unactioned approvals expire after 72 hours, automatically closing the proposal and notifying the customer.

# 11. AI Safety and Trust Requirements

- **Authorization:** AI must not bypass the backend's RBAC. Tool requests carry the user's permission context.
- **Sensitive actions:** Must physically halt execution until asynchronous human approval is granted via the backend API.
- **Hallucination prevention:** Knowledge-based responses must be grounded in retrieved authoritative company sources. Operational facts must come from authorized business tools. For requests where sufficient authoritative evidence is unavailable, the AI must not fabricate information and should clearly state the limitation or escalate when appropriate.
- **Auditability:** Audit logs should capture the request, agent, tool calls, sanitized tool inputs, result summary, retrieved source references, decision/action, approval, latency, and errors. Store final user-facing responses only where functionally necessary.
- **Transparency:** The UI must clearly indicate when a user is speaking to an AI and explicitly show when the AI is waiting for human approval.

# 12. Non-Functional Requirements

- **Local Execution:** 100% operational on local hardware using Ollama (no OpenAI/Anthropic).
- **Latency Targets:**
  - Simple RAG: < 8s
  - Single tool call: < 12s
  - Multi-step workflow: < 30s
- **Security:** Do not log passwords, JWTs, or unnecessary PII in the AI audit trails.
- **Maintainability:** Strict separation of Node.js business logic and Python AI orchestration.

# 13. MVP Scope

### Must Have
- Functional Node.js REST API with Postgres DB.
- Python FastAPI AI Service using LangGraph and local Ollama inference.
- Synthetic data generation (Customers, Orders, Tickets).
- RAG pipeline using Qdrant (PDF ingestion, chunking, retrieval).
- Support Agent capable of answering policy questions and looking up orders.
- Operations Agent capability (small, focused on internal tasks, issue escalation, operational workflows).
- MCP-based business tool interface with at least 3-5 initial tools (e.g., `get_order`, `get_payment`, `search_knowledge`, `create_task`, `request_refund`).
- Human-in-the-loop approval UI for refunds.
- Basic React/Vite dashboard.
- Audit log dashboard.

### Should Have
- Triage agent for initial routing.
- Workflow automation engine (basic triggers).

### Could Have
- Advanced evaluation dataset metrics.

### Explicitly Out of Scope
- Paid LLM API integration.
- Distributed microservices (Kafka/Redis).
- Real payment gateway integration.
- Production-grade cloud deployment (AWS/K8s).

# 14. Acceptance Criteria

- User can submit a support request via the React frontend.
- The AI classifies supported intents and is evaluated against the project evaluation dataset.
- The AI retrieves company policy and grounds answers (evaluated against the dataset).
- AI successfully inspects PostgreSQL data via authenticated Node.js tools.
- AI proposes a refund; execution halts until a `SUPPORT_MANAGER` clicks "Approve".
- Approved refund executes and state is updated.
- Every step is visible in the Audit Log UI.
- Operations Agent identifies work, filters data, and correctly creates required internal tasks.
- The entire stack runs entirely on local hardware (`docker-compose up`).

# 15. Demo Scenarios

**A. RAG policy question**
Customer asks a complex return policy question. AI answers based *only* on RAG documents without hallucinations.

**B. Order lookup through an authorized tool**
Customer asks where their order is. AI dynamically calls `get_order`, synthesizes the status, and replies.

**C. Refund requiring human approval**
Customer demands a refund. AI checks policy, validates order, proposes refund. Demo switches to Manager UI, showing the approval queue. Manager approves, AI finalizes the interaction.

**D. Operations automation using tools/MCP**
A manager asks: "Find the three oldest unresolved high-priority tickets and create follow-up tasks for the support team."
Flow: Operations Agent → retrieve authorized ticket data → analyze/filter → create tasks → return summary.

# 16. Project Success Criteria

- **Engineering:** A pristine, strongly decoupled architecture that strictly follows the constraints in `PROJECT_MASTER.md`. 
- **AI Perspective:** Demonstrates real agentic behavior (LangGraph orchestration, tool calling, RAG) on a small, quantized local model (Qwen3 8B Q4_K_M).
- **Business Usefulness:** Solves a realistic e-commerce problem without treating AI as an uncontrollable black box.
- **Resume Perspective:** Serves as a credible, defensively architected full-stack AI project that highlights strong engineering maturity over buzzword accumulation.

# Document Status

Status: Frozen
Source of Truth: docs/PROJECT_MASTER.md
Last Updated: 2026-08-20
