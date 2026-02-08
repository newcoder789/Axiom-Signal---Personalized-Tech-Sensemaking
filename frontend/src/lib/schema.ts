import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, decimal, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
}, (table) => ({
    journalIdIdx: index('thoughts_journal_id_idx').on(table.journalId),
    parentIdIdx: index('thoughts_parent_id_idx').on(table.parentId),
    verdictIdx: index('thoughts_verdict_idx').on(table.verdict),
    confidenceIdx: index('thoughts_confidence_idx').on(table.confidence),
    createdAtIdx: index('thoughts_created_at_idx').on(table.createdAt),
}));

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

// Focus sessions
export const focusSessions = pgTable('focus_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    thoughtId: uuid('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    actionItem: text('action_item').notNull(),
    durationMinutes: integer('duration_minutes'),
    completed: boolean('completed').default(false),
    outcome: text('outcome'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    thoughtIdIdx: index('focus_sessions_thought_id_idx').on(table.thoughtId),
    userIdIdx: index('focus_sessions_user_id_idx').on(table.userId),
    startedAtIdx: index('focus_sessions_started_at_idx').on(table.startedAt),
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
