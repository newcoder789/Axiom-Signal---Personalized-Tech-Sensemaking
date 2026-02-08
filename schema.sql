-- Initial Schema for Axiom Journal
-- Run this manually: psql -U axiom -d axiom_dev -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Journals table
CREATE TABLE IF NOT EXISTS journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT '📝',
    is_archived BOOLEAN DEFAULT FALSE,
    slug VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS journals_user_id_idx ON journals(user_id);
CREATE INDEX IF NOT EXISTS journals_slug_idx ON journals(slug);
CREATE INDEX IF NOT EXISTS journals_created_at_idx ON journals(created_at DESC);

-- Thoughts table
CREATE TABLE IF NOT EXISTS thoughts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES thoughts(id) ON DELETE SET NULL,
    
    -- Core content
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    
    -- Axiom analysis
    verdict VARCHAR(50),
    confidence DECIMAL(5,2),
    reasoning TEXT,
    timeline VARCHAR(100),
    
    -- Structured data
    action_items JSONB DEFAULT '[]'::jsonb,
    reason_codes JSONB DEFAULT '[]'::jsonb,
    tool_evidence JSONB DEFAULT '{}'::jsonb,
    sources JSONB DEFAULT '[]'::jsonb,
    
    -- Metrics
    coherence_score DECIMAL(4,3),
    relevance_score DECIMAL(4,3),
    
    -- User feedback
    feedback_type VARCHAR(50),
    feedback_note TEXT,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT verdict_check CHECK (verdict IN ('pursue', 'explore', 'watchlist', 'ignore', 'archive')),
    CONSTRAINT feedback_type_check CHECK (feedback_type IN ('agree', 'too_optimistic', 'too_conservative', 'wrong_assumption', 'missing_context'))
);

CREATE INDEX IF NOT EXISTS thoughts_journal_id_idx ON thoughts(journal_id);
CREATE INDEX IF NOT EXISTS thoughts_parent_id_idx ON thoughts(parent_id);
CREATE INDEX IF NOT EXISTS thoughts_verdict_idx ON thoughts(verdict);
CREATE INDEX IF NOT EXISTS thoughts_confidence_idx ON thoughts(confidence DESC);
CREATE INDEX IF NOT EXISTS thoughts_created_at_idx ON thoughts(created_at DESC);

-- Beliefs table
CREATE TABLE IF NOT EXISTS beliefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    category VARCHAR(50),
    confidence DECIMAL(4,3) DEFAULT 0.500,
    trend VARCHAR(20),
    status VARCHAR(50),
    evidence JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT category_check CHECK (category IN ('market', 'technical', 'personal', 'resource', 'assumption')),
    CONSTRAINT trend_check CHECK (trend IN ('rising', 'falling', 'stable', 'volatile')),
    CONSTRAINT status_check CHECK (status IN ('active', 'challenged', 'retired', 'proven', 'disproven'))
);

CREATE INDEX IF NOT EXISTS beliefs_thought_id_idx ON beliefs(thought_id);
CREATE INDEX IF NOT EXISTS beliefs_category_idx ON beliefs(category);
CREATE INDEX IF NOT EXISTS beliefs_status_idx ON beliefs(status);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, user_id)
);

-- Thought-tag relationships
CREATE TABLE IF NOT EXISTS thought_tags (
    thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (thought_id, tag_id)
);

-- Focus sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    action_item TEXT NOT NULL,
    duration_minutes INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    outcome TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS focus_sessions_thought_id_idx ON focus_sessions(thought_id);
CREATE INDEX IF NOT EXISTS focus_sessions_user_id_idx ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS focus_sessions_started_at_idx ON focus_sessions(started_at DESC);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_journals_updated_at 
BEFORE UPDATE ON journals 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thoughts_updated_at 
BEFORE UPDATE ON thoughts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beliefs_updated_at 
BEFORE UPDATE ON beliefs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo user
INSERT INTO users (id, email, name) 
VALUES ('demo-user-123', 'demo@axiom.local', 'Demo User')
ON CONFLICT (email) DO NOTHING;
