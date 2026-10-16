CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 1. USERS TABLE (Handles Authors & Admins with Role-Based Access)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id VARCHAR(50) UNIQUE, -- Matches "AUTH001" from dataset (NULL for admin)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed with bcryptjs
    phone VARCHAR(50),
    city VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'AUTHOR' CHECK (role IN ('AUTHOR', 'ADMIN')),
    joined_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 2. BOOKS TABLE (Captures Catalog, Royalties & Production States)

CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR(50) UNIQUE NOT NULL, -- Matches "BK001" from dataset
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(50),
    genre VARCHAR(100),
    publication_date DATE, -- NULL for books still in production (e.g. Cover Design)
    status VARCHAR(100) NOT NULL, -- e.g. "Published & Live", "In Production - Typesetting"
    mrp NUMERIC(10, 2), -- NULL for unpublished books
    author_royalty_per_copy NUMERIC(10, 2),
    total_copies_sold INTEGER DEFAULT 0,
    total_royalty_earned NUMERIC(12, 2) DEFAULT 0.00,
    royalty_paid NUMERIC(12, 2) DEFAULT 0.00,
    royalty_pending NUMERIC(12, 2) DEFAULT 0.00,
    last_payout_date DATE,
    print_partner VARCHAR(100), -- "In-House", "Repro India", "Epitome Books"
    available_on TEXT[] DEFAULT ARRAY[]::TEXT[], -- PostgreSQL array: {"Amazon India", "Flipkart"}
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 3. TICKETS TABLE (Support Queries, AI Classifications & Overrides)

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL UNIQUE, -- Human-readable ticket number (e.g., #1, #2)
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    
    -- Active category & AI's original classification
    category VARCHAR(100) NOT NULL DEFAULT 'GENERAL_INQUIRY' 
        CHECK (category IN (
            'ROYALTY_AND_PAYMENTS',
            'ISBN_AND_METADATA',
            'PRINTING_AND_QUALITY',
            'DISTRIBUTION_AND_AVAILABILITY',
            'BOOK_STATUS_AND_PRODUCTION',
            'GENERAL_INQUIRY'
        )),
    ai_category VARCHAR(100),
    
    -- Active priority & AI's original priority score
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' 
        CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    ai_priority VARCHAR(20),
    ai_confidence NUMERIC(3, 2), -- Confidence score e.g. 0.95

    -- AI Generated response draft based on Knowledge Base
    ai_draft_response TEXT,
    ai_drafted_at TIMESTAMPTZ,

    -- Foreign keys
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE SET NULL, -- NULL if "General / Account Level"
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 4. TICKET MESSAGES TABLE (Conversation Timeline visible to Author)

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 5. INTERNAL NOTES TABLE (Ops Notes strictly hidden from Author)

CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- INDEXES FOR HIGH-PERFORMANCE QUERIES

CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_author_id ON tickets(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_ticket_id ON internal_notes(ticket_id);