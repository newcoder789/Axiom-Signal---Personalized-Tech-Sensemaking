import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, decimal, integer, index, primaryKey } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from '@auth/core/adapters';
import { sql } from 'drizzle-orm';

// Users table (NextAuth compatible)
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Accounts table (NextAuth)
export const accounts = pgTable(
    "account",
    {
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccount["type"]>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
    })
);

// Sessions table (NextAuth)
export const sessions = pgTable("session", {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Verification tokens (NextAuth)
export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

// Journals table
export const journals = pgTable('journals', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#3B82F6'),
    icon: varchar('icon', { length: 50 }).default('📝'),
    isArchived: boolean('is_archived').default(false),
    slug: varchar('slug', { length: 255 }).unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
    userIdIdx: index('journals_user_id_idx').on(table.userId),
    slugIdx: index('journals_slug_idx').on(table.slug),
    createdAtIdx: index('journals_created_at_idx').on(table.createdAt),
}));

// Thoughts table (decision journal entries)
export const thoughts = pgTable('thoughts', {
    id: uuid('id').defaultRandom().primaryKey(),
    journalId: uuid('journal_id').references(() => journals.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),

    // Core content
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    context: jsonb('context').$type<Record<string, any>>().default({}),

    // Axiom analysis
    verdict: varchar('verdict', { length: 50 }).$type<'pursue' | 'explore' | 'watchlist' | 'ignore' | 'archive'>(),
    confidence: decimal('confidence', { precision: 5, scale: 2 }), // Stores percentage like 82.50
    reasoning: text('reasoning'),
    timeline: varchar('timeline', { length: 100 }),

    // Structured data
    actionItems: jsonb('action_items').$type<Array<{ text: string; completed: boolean }>>().default([]),
    reasonCodes: jsonb('reason_codes').$type<string[]>().default([]),
    toolEvidence: jsonb('tool_evidence').$type<Record<string, any>>().default({}),

    // User feedback for RLHF
    feedback: jsonb('feedback').$type<{
        helpful: boolean;
        tags: string[];
        comments?: string;
        timestamp: string;
    }>(),

    sources: jsonb('sources').$type<Array<{
        title: string;
        url: string;
        snippet: string;
        domain: string;
        date: string;
        relevance: number;
    }>>().default([]),

    // Metrics
    coherenceScore: decimal('coherence_score', { precision: 4, scale: 3 }),
    relevanceScore: decimal('relevance_score', { precision: 4, scale: 3 }),

    // User feedback
    feedbackType: varchar('feedback_type', { length: 50 }).$type<'agree' | 'too_optimistic' | 'too_conservative' | 'wrong_assumption' | 'missing_context'>(),
    feedbackNote: text('feedback_note'),

    // Versioning
    version: integer('version').default(1),
    isCurrent: boolean('is_current').default(true),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Phase 3: Feedback Stats
    feedbackCount: integer('feedback_count').default(0),
    confidenceHistory: jsonb('confidence_history').$type<any[]>().default([]),
    verdictHistory: jsonb('verdict_history').$type<any[]>().default([]),
}, (table) => ({
    journalIdIdx: index('thoughts_journal_id_idx').on(table.journalId),
    parentIdIdx: index('thoughts_parent_id_idx').on(table.parentId),
    verdictIdx: index('thoughts_verdict_idx').on(table.verdict),
    confidenceIdx: index('thoughts_confidence_idx').on(table.confidence),
    createdAtIdx: index('thoughts_created_at_idx').on(table.createdAt),
}));

// Feedback table (Phase 3)
export const feedback = pgTable('feedback', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Feedback types (can select multiple)
    isTooOptimistic: boolean('is_too_optimistic').default(false),
    isTooConservative: boolean('is_too_conservative').default(false),
    hasWrongAssumption: boolean('has_wrong_assumption').default(false),
    missingContext: boolean('missing_context').default(false),
    isCorrect: boolean('is_correct').default(false),

    // Specific corrections
    correctedVerdict: varchar('corrected_verdict', { length: 50 }).$type<'pursue' | 'explore' | 'watchlist' | 'ignore'>(),
    correctedConfidence: decimal('corrected_confidence', { precision: 4, scale: 3 }),
    correctedTimeline: varchar('corrected_timeline', { length: 100 }),

    // Free text feedback
    comment: text('comment'),

    // Impact tracking
    confidenceAdjustment: decimal('confidence_adjustment', { precision: 4, scale: 3 }).default('0.0'),
    usedInTraining: boolean('used_in_training').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('feedback_thought_id_idx').on(table.thoughtId),
    userIdIdx: index('feedback_user_id_idx').on(table.userId),
}));

// Feedback adjustments history
export const feedbackAdjustments = pgTable('feedback_adjustments', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    feedbackId: uuid('feedback_id').references(() => feedback.id, { onDelete: 'cascade' }),

    adjustmentValue: decimal('adjustment_value', { precision: 4, scale: 3 }).notNull(),
    adjustmentType: varchar('adjustment_type', { length: 50 }),
    appliedToFutureAnalyses: boolean('applied_to_future_analyses').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Beliefs table 
export const beliefs = pgTable('beliefs', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),
    statement: text('statement').notNull(),
    category: varchar('category', { length: 50 }).$type<'market' | 'technical' | 'personal' | 'resource' | 'assumption'>(),
    confidence: decimal('confidence', { precision: 4, scale: 3 }).default('0.500'),
    trend: varchar('trend', { length: 20 }).$type<'rising' | 'falling' | 'stable' | 'volatile'>(),
    status: varchar('status', { length: 50 }).$type<'active' | 'challenged' | 'retired' | 'proven' | 'disproven'>(),
    evidence: jsonb('evidence').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('beliefs_thought_id_idx').on(table.thoughtId),
    categoryIdx: index('beliefs_category_idx').on(table.category),
    statusIdx: index('beliefs_status_idx').on(table.status),
}));

// Tags for categorization
export const tags = pgTable('tags', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Thought-tag relationships
export const thoughtTags = pgTable('thought_tags', {
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }).notNull(),
    tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    pk: index('thought_tags_pk').on(table.thoughtId, table.tagId),
}));

// Focus sessions (Phase 4)
export const focusSessions = pgTable('focus_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Session info
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // Action items from thought
    actionItems: jsonb('action_items').$type<Array<{ id: string; text: string; completed: boolean }>>().notNull().default([]),

    // Timing
    targetDurationMinutes: integer('target_duration_minutes').notNull().default(25),
    actualDurationMinutes: integer('actual_duration_minutes'),
    plannedStartTime: timestamp('planned_start_time', { withTimezone: true }),
    actualStartTime: timestamp('actual_started_time', { withTimezone: true }),
    actualEndTime: timestamp('actual_end_time', { withTimezone: true }),

    // Progress tracking
    completedActionCount: integer('completed_action_count').default(0),
    totalActionCount: integer('total_action_count').default(0),
    progressPercent: decimal('progress_percent', { precision: 5, scale: 2 }).default('0.0'),

    // Session outcome
    status: varchar('status', { length: 50 }).$type<'planned' | 'in_progress' | 'completed' | 'abandoned' | 'interrupted'>(),
    outcomeType: varchar('outcome_type', { length: 50 }).$type<'completed' | 'drifted' | 'abandoned' | 'successful'>(),
    outcomeNotes: text('outcome_notes'),

    // Metrics
    focusScore: decimal('focus_score', { precision: 4, scale: 3 }), // 0-1 how focused was the session
    productivityScore: decimal('productivity_score', { precision: 4, scale: 3 }), // 0-1 how productive

    // Auto-journaling
    autoJournalEntryId: uuid('auto_journal_entry_id').references(() => thoughts.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    userIdIdx: index('focus_sessions_user_id_idx').on(table.userId),
    statusIdx: index('focus_sessions_status_idx').on(table.status),
    createdAtIdx: index('focus_sessions_created_at_idx').on(table.createdAt),
}));

// Focus metrics for analytics
export const focusMetrics = pgTable('focus_metrics', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => focusSessions.id, { onDelete: 'cascade' }),

    metricType: varchar('metric_type', { length: 50 }), // 'attention', 'completion_rate', 'time_spent'
    metricValue: decimal('metric_value', { precision: 10, scale: 4 }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    userIdIdx: index('focus_metrics_user_id_idx').on(table.userId),
    sessionIdIdx: index('focus_metrics_session_id_idx').on(table.sessionId),
}));

// Focus streaks and habits
export const focusHabits = pgTable('focus_habits', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    currentStreak: integer('current_streak').default(0),
    longestStreak: integer('longest_streak').default(0),
    totalSessions: integer('total_sessions').default(0),
    totalFocusMinutes: integer('total_focus_minutes').default(0),

    lastSessionDate: timestamp('last_session_date', { mode: 'date' }),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Reasoning Nodes (Phase 3/4)
export const reasoningNodes = pgTable('reasoning_nodes', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),

    // Node content
    nodeType: varchar('node_type', { length: 50 }).$type<'observation' | 'evidence' | 'assumption' | 'inference' | 'conclusion' | 'action'>(),
    content: text('content').notNull(),

    // Reasoning metadata
    confidence: decimal('confidence', { precision: 4, scale: 3 }).default('0.5'),
    sourceTool: varchar('source_tool', { length: 100 }), // 'market', 'freshness', 'friction', 'memory'
    sourceData: jsonb('source_data'), // Raw data from tool

    // Position in graph
    xPosition: integer('x_position'),
    yPosition: integer('y_position'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('reasoning_nodes_thought_id_idx').on(table.thoughtId),
    nodeTypeIdx: index('reasoning_nodes_node_type_idx').on(table.nodeType),
}));

export const reasoningEdges = pgTable('reasoning_edges', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),
    sourceNodeId: uuid('source_node_id').references(() => reasoningNodes.id, { onDelete: 'cascade' }),
    targetNodeId: uuid('target_node_id').references(() => reasoningNodes.id, { onDelete: 'cascade' }),

    // Relationship type
    edgeType: varchar('edge_type', { length: 50 }).$type<'supports' | 'contradicts' | 'leads_to' | 'depends_on' | 'explains' | 'questions'>(),

    // Strength and confidence
    strength: decimal('strength', { precision: 4, scale: 3 }).default('0.5'),
    confidence: decimal('confidence', { precision: 4, scale: 3 }).default('0.5'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('reasoning_edges_thought_id_idx').on(table.thoughtId),
    sourceIdx: index('reasoning_edges_source_node_id_idx').on(table.sourceNodeId),
    targetIdx: index('reasoning_edges_target_node_id_idx').on(table.targetNodeId),
}));

// Tool execution traces
export const toolExecutionTraces = pgTable('tool_execution_traces', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),

    toolName: varchar('tool_name', { length: 100 }).notNull(), // 'market_analysis', 'freshness_check', etc.
    executionOrder: integer('execution_order').notNull(),

    // Input and output
    inputData: jsonb('input_data'),
    outputData: jsonb('output_data').notNull(),

    // Performance metrics
    executionTimeMs: integer('execution_time_ms'),
    success: boolean('success').default(true),
    errorMessage: text('error_message'),

    // Confidence propagation
    inputConfidence: decimal('input_confidence', { precision: 4, scale: 3 }),
    outputConfidence: decimal('output_confidence', { precision: 4, scale: 3 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('tool_traces_thought_id_idx').on(table.thoughtId),
    toolNameIdx: index('tool_traces_tool_name_idx').on(table.toolName),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Journal = typeof journals.$inferSelect;
export type NewJournal = typeof journals.$inferInsert;

export type Thought = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;

export type Belief = typeof beliefs.$inferSelect;
export type NewBelief = typeof beliefs.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

export type ToolExecutionTrace = typeof toolExecutionTraces.$inferSelect;
export type ReasoningNode = typeof reasoningNodes.$inferSelect;
export type ReasoningEdge = typeof reasoningEdges.$inferSelect;
