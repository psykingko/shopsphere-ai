-- Enums
CREATE TYPE role_name AS ENUM ('ADMIN', 'SUPPORT_AGENT', 'SUPPORT_MANAGER', 'OPERATIONS');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REFUNDED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE shipment_status AS ENUM ('PREPARING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'FAILED');
CREATE TYPE workflow_status AS ENUM ('ACTIVE', 'DEPRECATED');
CREATE TYPE workflow_execution_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE knowledge_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE ai_conversation_status AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE sender_type AS ENUM ('CUSTOMER', 'AGENT', 'AI');
CREATE TYPE actor_type AS ENUM ('USER', 'AI', 'SYSTEM');

-- Tables

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name role_name UNIQUE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    role_id UUID NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL
);

CREATE TABLE customers (
    id UUID PRIMARY KEY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR,
    deleted_at TIMESTAMP
);

CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    street VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    zip VARCHAR NOT NULL,
    country VARCHAR NOT NULL,
    deleted_at TIMESTAMP
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    stock_quantity INTEGER NOT NULL,
    category_id UUID NOT NULL REFERENCES product_categories(id),
    active BOOLEAN NOT NULL
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    business_id VARCHAR UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    total_amount NUMERIC NOT NULL,
    status order_status NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    amount NUMERIC NOT NULL,
    status payment_status NOT NULL,
    gateway_reference VARCHAR
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    carrier VARCHAR,
    tracking_number VARCHAR,
    status shipment_status NOT NULL,
    estimated_delivery TIMESTAMP
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY,
    business_id VARCHAR UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    assigned_user_id UUID REFERENCES users(id),
    subject VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    priority ticket_priority NOT NULL,
    status ticket_status NOT NULL
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES support_tickets(id),
    sender_type sender_type NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    business_id VARCHAR UNIQUE NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    priority task_priority NOT NULL,
    status task_status NOT NULL,
    creator_type actor_type NOT NULL,
    related_entity_type VARCHAR,
    related_entity_id UUID
);

CREATE TABLE task_assignments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL,
    unassigned_at TIMESTAMP,
    active_flag BOOLEAN NOT NULL
);

CREATE TABLE approval_requests (
    id UUID PRIMARY KEY,
    requested_action VARCHAR NOT NULL,
    requesting_user_id UUID REFERENCES users(id),
    requesting_actor_type actor_type NOT NULL,
    target_entity_type VARCHAR NOT NULL,
    target_entity_id UUID NOT NULL,
    risk_level VARCHAR,
    decision_rationale TEXT,
    status approval_status NOT NULL,
    reviewer_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP,
    expiration_timestamp TIMESTAMP,
    rejection_reason TEXT,
    execution_result_summary TEXT
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    status workflow_status NOT NULL
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    status workflow_execution_status NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    execution_log TEXT
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    request_id VARCHAR,
    actor_type actor_type NOT NULL,
    actor_id UUID,
    action VARCHAR NOT NULL,
    entity_type VARCHAR,
    entity_id UUID,
    sanitized_input JSONB,
    result_summary TEXT,
    timestamp TIMESTAMP NOT NULL,
    approval_request_id UUID REFERENCES approval_requests(id)
);

CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY,
    title VARCHAR NOT NULL,
    document_type VARCHAR,
    department VARCHAR,
    status knowledge_status NOT NULL
);

CREATE TABLE knowledge_document_versions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id),
    version_number INTEGER NOT NULL,
    content_hash VARCHAR NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    expiration_date TIMESTAMP,
    status knowledge_status NOT NULL,
    source_path VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE knowledge_chunk_metadata (
    id UUID PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES knowledge_document_versions(id),
    chunk_index INTEGER NOT NULL,
    qdrant_point_id UUID NOT NULL
);

CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    started_at TIMESTAMP NOT NULL,
    status ai_conversation_status NOT NULL
);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
    role VARCHAR NOT NULL,
    content TEXT NOT NULL
);
