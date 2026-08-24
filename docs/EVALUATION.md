# ShopSphere AI - Evaluation Architecture

*Status: Frozen*
*Source of Truth: docs/PROJECT_MASTER.md*

==================================================
## 1. PURPOSE
==================================================

This document defines how ShopSphere AI will be evaluated for:
- RAG retrieval quality
- grounded answer quality
- agent routing accuracy
- tool-selection accuracy
- tool argument correctness
- business-action correctness
- approval safety
- hallucination resistance
- prompt-injection resistance
- failure handling
- idempotency safety
- latency
- local-model performance
- end-to-end task success

The goal is to prove that ShopSphere AI is not merely a technology demonstration. It must be possible to demonstrate measurable system behavior.

==================================================
## 2. EVALUATION PRINCIPLE
==================================================

**"Do not evaluate the model alone. Evaluate the complete system."**

The system includes:
User Request → Node → AI Service → LangGraph → RAG/MCP → Node business rules → PostgreSQL → final response

A correct final answer is not sufficient if:
- the wrong tool was selected
- authorization was bypassed
- an unsafe action was executed
- RAG retrieved incorrect evidence
- a sensitive action bypassed approval
- the system claimed an action succeeded when it failed

==================================================
## 3. EVALUATION LAYERS
==================================================

**LEVEL 1 — Component Evaluation**
Evaluate individual components:
- document ingestion
- chunking
- embedding/retrieval
- tool schemas
- Node business rules
- approval state transitions

**LEVEL 2 — AI Behavior Evaluation**
Evaluate:
- classification
- routing
- capability selection
- tool selection
- tool arguments
- grounded response generation

**LEVEL 3 — Safety Evaluation**
Evaluate:
- authorization bypass resistance
- prompt injection resistance
- RAG poisoning resistance
- approval bypass resistance
- duplicate mutation protection
- secret/PII leakage

**LEVEL 4 — End-to-End Evaluation**
Evaluate complete user tasks from request to final outcome.

**LEVEL 5 — Performance Evaluation**
Evaluate:
- latency
- throughput where practical
- retrieval latency
- tool latency
- model generation latency
- end-to-end latency
- local resource usage

==================================================
## 4. EVALUATION DATASET
==================================================

The dataset should contain representative scenarios, not random questions.

Each test case should conceptually contain:
- `test_case_id`
- `category`
- `user_input`
- `expected_intent`
- `expected_capability`
- `expected_rag_usage`
- `expected_tool_sequence`
- `expected_tool_arguments`
- `expected_authorization_outcome`
- `expected_approval_behavior`
- `expected_final_outcome`
- `expected_answer_facts`
- `risk_level`

This format will be followed when building the future evaluation dataset.

==================================================
## 5. TEST CASE CATEGORIES
==================================================

**A. KNOWLEDGE**
Examples:
"What is our refund policy?"
"What is the return window?"

**B. LIVE BUSINESS DATA**
Examples:
"Where is ORD-123?"
"What is the status of ticket TKT-100?"

**C. MIXED KNOWLEDGE + BUSINESS DATA**
Examples:
"Can ORD-123 be refunded under our policy?"
"Is this order eligible for cancellation?"

**D. SAFE MUTATIONS**
Examples:
"Create a follow-up task."
"Add an internal note."

**E. SENSITIVE MUTATIONS**
Examples:
"Refund ORD-123."
"Cancel ORD-123."

**F. OPERATIONS**
Examples:
"Find the 3 oldest high-priority unresolved tickets."
"Find overdue tickets and create follow-up tasks."

**G. AMBIGUOUS REQUESTS**
Examples:
"Cancel it."
"Refund my order."

**H. NO-EVIDENCE QUESTIONS**
Questions where the knowledge base does not contain the answer.

**I. PROMPT INJECTION**
Examples containing instructions designed to override system behavior.

**J. TOOL FAILURE**
Simulated tool timeout/error/malformed response.

**K. AUTHORIZATION FAILURE**
User attempts an action outside their permissions.

**L. IDEMPOTENCY**
Duplicate mutation requests with:
- same key + same payload
- same key + different payload

**M. APPROVAL LIFECYCLE**
- pending
- approved
- rejected
- expired

==================================================
## 6. RAG EVALUATION
==================================================

Evaluate:
1. Retrieval relevance
2. Retrieval completeness
3. Context precision
4. Context recall
5. Answer groundedness
6. Citation/source correctness
7. No-answer behavior

Evaluation must work locally without expensive external evaluation APIs.

Conceptual metrics:
- Precision@K
- Recall@K
- Hit Rate@K
- MRR where appropriate
- Grounded Answer Rate
- Unsupported Claim Rate

*Do not invent target benchmark numbers. Targets will be established after the first baseline run.*

==================================================
## 7. RAG RETRIEVAL TESTING
==================================================

For each query:
Query → expected relevant document/chunk IDs → retrieve top-K → compare retrieved IDs against expected IDs

Evaluate multiple K values where practical (e.g., K=3, K=5, K=10). The chosen K should be based on empirical evaluation rather than assumed optimal.

==================================================
## 8. NO-ANSWER EVALUATION
==================================================

Create tests where the knowledge base does NOT contain the answer.

Expected behavior:
- agent recognizes insufficient evidence
- does not fabricate policy
- does not invent citations
- asks clarification when appropriate
- escalates when appropriate

Measure:
**Unsupported Answer Rate** (treated as a critical safety metric)

==================================================
## 9. AGENT ROUTING EVALUATION
==================================================

Evaluate classification into:
- KNOWLEDGE_QUERY
- CUSTOMER_SUPPORT
- OPERATIONS_TASK
- GENERAL

Measure:
**Routing Accuracy**

Record:
- false RAG invocation
- false MCP invocation
- missed RAG invocation
- missed MCP invocation

The chosen capability path must also be practically appropriate.

==================================================
## 10. TOOL SELECTION EVALUATION
==================================================

Evaluate whether the agent chooses the correct tool.

If a query genuinely permits multiple valid tools, define an explicit acceptable tool set rather than using ambiguous "/" notation. The evaluator must distinguish between an expected single tool and an explicitly acceptable tool set.

Examples:
- "Where is ORD-123?" → Expected: `get_shipment`
- "What is the status/amount/details of ORD-123?" → Expected: `get_order`
- "Find high-priority unresolved tickets." → Expected: `search_tickets`
- "Refund ORD-123." → Expected: `request_refund`

Measure:
**Tool Selection Accuracy**

Also measure:
- unnecessary tool calls
- missing tool calls
- invalid tool calls
- unknown tool attempts

The agent must never invent tools.

==================================================
## 11. TOOL ARGUMENT EVALUATION
==================================================

Evaluate model-generated tool arguments.

Examples:
- `search_tickets`: `priority = HIGH`, `status = OPEN`, `limit = 3`
- `get_order`: `order_id = ORD-123`

Measure:
**Argument Correctness / Exact Match Where Applicable**
**Argument Validation Failure Rate**

Definitions:
- deterministic scalar/filter arguments may use exact matching
- IDs, enums, limits, and structured filters should normally be exact
- normalized/free-text arguments may require semantic correctness evaluation
- incorrect target entities are always failures

The evaluation must judge whether the arguments are semantically correct, not merely whether JSON formatting is identical.

==================================================
## 12. TOOL SEQUENCE EVALUATION
==================================================

Evaluate multi-step workflows.

Example:
"Find the 3 oldest high-priority unresolved tickets and create follow-up tasks."

Expected:
`search_tickets` → `create_task` → `assign_task` ONLY IF REQUIRED

Measure:
**Correct Tool Sequence Rate**

A workflow that eventually succeeds using unnecessary or unsafe steps should not be considered fully correct.

==================================================
## 13. BUSINESS ACTION EVALUATION
==================================================

Evaluate whether the final business state is correct against authoritative Node/PostgreSQL state, not against the LLM's explanation.

Refund request:
- correct order
- correct eligibility
- correct approval requirement
- correct final state

Task creation:
- correct ticket/customer
- correct task
- correct assignment where required

==================================================
## 14. APPROVAL SAFETY EVALUATION
==================================================

Critical metric tests:
1. Sensitive action requested by authorized user.
2. Sensitive action requested by unauthorized user.
3. Sensitive action with invalid business state.
4. Duplicate sensitive request.
5. Pending approval.
6. Rejected approval.
7. Expired approval.
8. Modified approval payload attempt.

Expected:
- sensitive action cannot execute without required approval
- unauthorized users cannot create/execute unauthorized actions
- pending approval cannot execute
- rejected/expired approval cannot execute
- persisted approved action is executed exactly

Define: **Approval Bypass Rate**
Target: **0%**

Do not invent additional benchmark targets unless required.

==================================================
## 15. SECURITY EVALUATION
==================================================

Adversarial tests for:
- Prompt injection
- RAG poisoning
- Privilege escalation
- Forged principal context
- Unauthorized tool invocation
- SQL injection attempts
- Secret extraction
- PII extraction
- Path traversal
- Arbitrary code execution
- Tool flooding
- Approval bypass

Each test should verify that the security boundary prevents the attack from producing an unauthorized business action.

==================================================
## 16. HALLUCINATION EVALUATION
==================================================

Three forms:
1. Unsupported factual claim
2. Fabricated business state
3. Fabricated successful action

Examples:
- If MCP fails to retrieve an order: The agent must NOT say "Your order is currently shipped."
- If refund creation only produced ApprovalRequest: The agent must NOT say "Your refund has been processed."

Measure:
**Unsupported Claim Rate**
**False Action Success Rate**

False Action Success Rate should be treated as critical.

==================================================
## 17. FAILURE EVALUATION
==================================================

Test:
- LLM timeout
- LLM malformed output
- RAG unavailable
- Qdrant unavailable
- MCP timeout
- MCP malformed result
- authorization failure
- business validation failure
- PostgreSQL failure
- approval service failure

Verify:
- no false success
- no unsafe fallback
- useful error response
- auditability
- safe termination

==================================================
## 18. IDEMPOTENCY EVALUATION
==================================================

Test:
- Case A (same idempotency key + same payload): same original result / no duplicate mutation
- Case B (same idempotency key + different payload): conflict/rejection
- Case C (network retry after unknown result): safe recovery without duplicate sensitive mutation

Measure: **Duplicate Mutation Rate**
Critical target: **0 unintended duplicate mutations**

==================================================
## 19. PERFORMANCE EVALUATION
==================================================

Measure:
- Node API latency
- AI Service latency
- classification latency
- RAG retrieval latency
- MCP tool latency
- LLM generation latency
- end-to-end latency

Record p50, p95, p99 where enough samples exist.
For MVP, prioritize:
- **End-to-End Latency**
- **Time To First Response / First Token** where streaming is implemented.

Do not claim benchmark results before measuring.

==================================================
## 20. LOCAL MODEL EVALUATION
==================================================

Because MVP uses Ollama/local models, evaluate:
- model name
- quantization where applicable
- prompt size
- generation latency
- tokens/sec where available
- RAM usage
- VRAM usage where measurable
- tool-calling reliability
- structured-output reliability

Compare supported local models only when practically useful. Do not introduce paid model APIs or require cloud inference.

==================================================
## 21. MODEL COMPARISON
==================================================

Allow future comparison of models (e.g., Llama, Qwen, Gemma). Do NOT lock specific model versions in this document unless already defined by PROJECT_MASTER.md.

Evaluation should compare:
Quality vs. Latency vs. Resource Usage vs. Tool-calling reliability.

The best model is not automatically the largest model.

==================================================
## 22. END-TO-END SUCCESS RATE
==================================================

Primary portfolio metric: **End-to-End Task Success Rate**

A test is successful only when:
- correct intent
- correct capability path
- correct tool selection
- correct arguments
- correct authorization behavior
- correct business state
- correct approval behavior
- grounded final response

A fluent answer alone is not success.

==================================================
## 23. EVALUATION RESULT FORMAT
==================================================

Standard evaluation result record:
- `test_case_id`
- `timestamp`
- `model`
- `model_configuration`
- `latency`
- `classification`
- `selected_capabilities`
- `retrieved_documents`
- `selected_tools`
- `tool_arguments`
- `tool_results`
- `approval_state`
- `final_outcome`
- `expected_outcome`
- `pass/fail`
- `failure_category`
- `notes`

Do not store chain-of-thought. Store observable execution metadata only.

==================================================
## 24. FAILURE CATEGORIES
==================================================

Standard failure categories:
- ROUTING_ERROR
- RAG_RETRIEVAL_ERROR
- RAG_GROUNDEDNESS_ERROR
- TOOL_SELECTION_ERROR
- TOOL_ARGUMENT_ERROR
- AUTHORIZATION_ERROR
- BUSINESS_RULE_ERROR
- APPROVAL_ERROR
- IDEMPOTENCY_ERROR
- MODEL_OUTPUT_ERROR
- MCP_ERROR
- DATABASE_ERROR
- SECURITY_VIOLATION
- LATENCY_ERROR
- OTHER

This will make later evaluation reports consistent.

==================================================
## 25. BASELINE EVALUATION
==================================================

Baseline process. Before optimization:
1. Run the curated evaluation dataset.
2. Record all metrics.
3. Identify major failures.
4. Optimize one subsystem.
5. Re-run the same dataset.
6. Compare against baseline.

Never change the evaluation dataset simply to improve the score. This prevents benchmark gaming.

==================================================
## 26. REGRESSION EVALUATION
==================================================

Every major change should be evaluated against the baseline.

Changes include:
- embedding model
- chunking strategy
- retrieval parameters
- prompts
- LangGraph routing
- tool schemas
- business rules
- local LLM model
- MCP implementation

A change that improves one metric but breaks a critical safety metric must not automatically be accepted.

==================================================
## 27. EVALUATION PRIORITY
==================================================

Priority order:
1. **P0 — Safety**: approval bypass, unauthorized mutation, duplicate sensitive mutation, fabricated successful action.
2. **P1 — Correctness**: business correctness, tool selection, tool arguments, RAG grounding.
3. **P2 — Reliability**: failure handling, no-answer behavior, regression stability.
4. **P3 — Performance**: latency, resource usage.
5. **P4 — Quality improvements**: response style, wording, conversational polish.

Safety always outranks latency or response quality.

==================================================
## 28. DEMO / INTERVIEW EVALUATION
==================================================

Small live demonstration set showing:
1. Knowledge query → RAG
2. Live business query → MCP
3. Mixed policy + business query → RAG + MCP
4. Safe operation → MCP execution
5. Sensitive operation → ApprovalRequest
6. Manager approval → execution
7. Prompt injection → blocked by security boundary
8. Unknown knowledge → honest no-answer
9. Tool failure → safe failure

The live demo should not depend on internet connectivity or paid APIs.

==================================================
## 29. EVALUATION DASHBOARD / REPORT
==================================================

The future evaluation report should show at minimum:
- total test cases
- pass rate
- routing accuracy
- RAG retrieval metrics
- grounded answer rate
- tool selection accuracy
- tool argument accuracy
- tool sequence accuracy
- approval bypass rate
- false action success rate
- duplicate mutation rate
- end-to-end task success rate
- p50/p95 latency
- model/resource configuration

Do not build the dashboard yet.

==================================================
## 30. WHAT NOT TO MEASURE
==================================================

Do not make these primary success metrics:
- number of LLM calls
- number of agents
- number of tools
- number of lines of code
- number of vector documents
- prompt length
- architectural complexity

More complexity does not mean better AI.

==================================================
## 31. FUTURE EVALUATION EXTENSIONS
==================================================

Mention but do not implement:
- LLM-as-judge
- human preference evaluation
- automated adversarial generation
- large-scale synthetic datasets
- distributed load testing
- production observability
- online evaluation
- A/B testing
- external benchmark suites

MVP should rely primarily on deterministic and curated local tests.

==================================================
## 32. DIAGRAMS
==================================================

### 1. Evaluation Architecture
```mermaid
flowchart TD
    Dataset[Curated Dataset] --> EvalRunner[Local Evaluation Runner]
    Dataset --> |Expected Outcome / Test Oracle| OutcomeVerifier[Outcome Verifier]
    
    subgraph SUT [System Under Test]
        EvalRunner --> AI[AI Service]
        AI --> RAG_MCP[RAG and/or MCP]
        RAG_MCP --> NodeBiz[Node Business Layer]
        NodeBiz --> DB[(PostgreSQL)]
    end
    
    DB --> |Authoritative State| OutcomeVerifier
    AI --> |Final Response| OutcomeVerifier
    
    OutcomeVerifier --> Metrics[Evaluation Metrics]
    OutcomeVerifier --> FailCategorization[Failure Categorization]
```

### 2. Test-case Lifecycle
```mermaid
flowchart LR
    Input[Test Input] --> Exec[System Execution]
    Exec --> Final[Final State & Output]
    Final --> Assert1[Verify Routing]
    Assert1 --> Assert2[Verify Tools]
    Assert2 --> Assert3[Verify State/Approval]
    Assert3 --> Record[Record Pass/Fail]
```

### 3. RAG Evaluation Flow
```mermaid
flowchart TD
    Q[Query] --> Ret[Retrieve K Chunks]
    Ret --> CheckRel[Compare IDs to Expected]
    CheckRel --> Gen[LLM Generation]
    Gen --> CheckGround[Verify Groundedness]
    CheckGround --> RAGMetrics[Record RAG Metrics]
```

### 4. Agent/Tool Evaluation Flow
```mermaid
flowchart TD
    Req[Request] --> Route[Routing]
    Route --> ToolSel[Tool Selection]
    ToolSel --> ToolArg[Argument Generation]
    ToolArg --> Seq[Tool Sequence]
    
    Route -.-> |Check| RouteAcc[Routing Accuracy]
    ToolSel -.-> |Check| SelAcc[Selection Accuracy]
    ToolArg -.-> |Check| ArgAcc[Argument Match]
    Seq -.-> |Check| SeqAcc[Sequence Correctness]
```

### 5. Safety Evaluation Flow
```mermaid
flowchart TD
    Adv[Adversarial Request] --> Sys[System Under Test]
    Sys --> BlockCheck{Was Action Blocked?}
    BlockCheck -->|Yes| Pass[Safety Pass]
    BlockCheck -->|No| Fail[CRITICAL SAFETY FAIL]
```

### 6. Baseline → Optimization → Regression Cycle
```mermaid
flowchart LR
    Baseline[Run Baseline] --> Identify[Identify Failures]
    Identify --> Opt[Optimize Subsystem]
    Opt --> Regress[Run Regression]
    Regress --> Check{Score Improved & Safety Kept?}
    Check -->|Yes| Accept[Accept Change]
    Check -->|No| Reject[Reject Change]
```

==================================================
## 33. FINAL VALIDATION
==================================================

1. Tool-selection evaluation is objectively measurable.
2. Multiple acceptable tools are explicitly represented when needed.
3. Business outcomes are verified against authoritative state.
4. Evaluation does not bypass Node authorization.
5. Argument evaluation distinguishes exact and semantic correctness.
6. RAG metrics remain locally measurable.
7. Approval Bypass Rate remains a critical safety metric.
8. Duplicate Mutation Rate remains a critical safety metric.
9. No benchmark numbers are invented.
10. Baseline/regression methodology remains unchanged.
11. No application code is created.
12. No evaluation dataset is created yet.
