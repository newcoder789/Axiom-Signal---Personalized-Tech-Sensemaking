'use server';

import { db } from './db';
import { journals, thoughts, beliefs, tags, thoughtTags, focusSessions, users } from './schema';
import type { NewJournal, NewThought, Thought, Journal } from './schema';
import { eq, and, desc, like, or, sql, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ============================================================================
// USER ACTIONS
// ============================================================================

function generateUserId(): string {
    // Generate a stable user ID based on browser/session
    // In production, this would use auth session
    if (typeof window !== 'undefined') {
        // Client-side: use localStorage
        let userId = localStorage.getItem('axiom_user_id');
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem('axiom_user_id', userId);
        }
        return userId;
    }

    // Server-side: use a demo user for now
    // TODO: Replace with actual auth (NextAuth, Clerk, etc.)
    return '00000000-0000-0000-0000-000000000001';
}

export async function getCurrentUserId(): Promise<string> {
    return generateUserId();
}

export async function ensureUser() {
    // ⚠️ TEMPORARY: Use consistent user ID for demo until authentication is implemented
    // This ensures all data is associated with the same user across sessions
    // Must be a valid UUID format for PostgreSQL
    let userId = '00000000-0000-0000-0000-000000000001';

    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (existingUser.length === 0) {
        await db.insert(users).values({
            id: userId,
            email: `user_${userId.slice(0, 8)}@axiom.local`,
            name: 'Developer',
        });
    }

    return userId;
}

// ============================================================================
// JOURNAL ACTIONS
// ============================================================================

export async function createJournal(data: {
    title: string;
    description?: string;
    color?: string;
    icon?: string;
}) {
    const userId = await ensureUser();

    const slug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [journal] = await db.insert(journals).values({
        userId,
        title: data.title,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || '📝',
        slug,
    }).returning();

    // ✅ Only revalidate when running inside Next
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        revalidatePath('/journal');
    }
    return journal;
}

export async function getJournal(id: string): Promise<Journal | null> {
    const userId = await ensureUser();

    const result = await db.select()
        .from(journals)
        .where(
            and(
                eq(journals.id, id),
                eq(journals.userId, userId)
            )
        )
        .limit(1);

    return result[0] || null;
}

export async function getJournals(): Promise<Journal[]> {
    const userId = await ensureUser();

    return await db.select()
        .from(journals)
        .where(
            and(
                eq(journals.userId, userId),
                eq(journals.isArchived, false)
            )
        )
        .orderBy(desc(journals.updatedAt));
}

export async function getJournalBySlug(slug: string) {
    const userId = await ensureUser();

    const result = await db.select()
        .from(journals)
        .where(
            and(
                eq(journals.slug, slug),
                eq(journals.userId, userId)
            )
        )
        .limit(1);

    return result[0] || null;
}

// ============================================================================
// THOUGHT ACTIONS
// ============================================================================

export async function createThought(data: {
    journalId: string;
    title: string;
    content: string;
    context?: Record<string, any>;
    verdict?: 'pursue' | 'explore' | 'watchlist' | 'ignore' | 'archive';
    confidence?: number;
    reasoning?: string;
    timeline?: string;
    actionItems?: Array<{ text: string; completed: boolean }>;
    reasonCodes?: string[];
    toolEvidence?: Record<string, any>;
    sources?: Array<any>;
}) {
    const [thought] = await db.insert(thoughts).values({
        journalId: data.journalId,
        title: data.title,
        content: data.content,
        context: data.context || {},
        verdict: data.verdict,
        confidence: data.confidence?.toString(),
        reasoning: data.reasoning,
        timeline: data.timeline,
        actionItems: data.actionItems || [],
        reasonCodes: data.reasonCodes || [],
        toolEvidence: data.toolEvidence || {},
        sources: data.sources || [],
        isCurrent: true,
        version: 1,
    }).returning();

    // ✅ Only revalidate when running inside Next
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        revalidatePath('/journal');
        revalidatePath(`/journal/${data.journalId}`);
    }
    return thought;
}

export async function getThoughtsByJournal(journalId: string): Promise<Thought[]> {
    return await db.select()
        .from(thoughts)
        .where(
            and(
                eq(thoughts.journalId, journalId),
                eq(thoughts.isCurrent, true)
            )
        )
        .orderBy(desc(thoughts.createdAt));
}

export async function getThoughtById(id: string) {
    const result = await db.select()
        .from(thoughts)
        .where(eq(thoughts.id, id))
        .limit(1);

    return result[0] || null;
}

export async function updateThought(id: string, data: {
    title?: string;
    content?: string;
    verdict?: 'pursue' | 'explore' | 'watchlist' | 'ignore' | 'archive';
    confidence?: number;
}) {
    const [updated] = await db.update(thoughts)
        .set({
            title: data.title,
            content: data.content,
            verdict: data.verdict,
            confidence: data.confidence?.toString(),
            updatedAt: new Date(),
        })
        .where(eq(thoughts.id, id))
        .returning();

    revalidatePath('/journal');
    return updated;
}

export async function updateThoughtFeedback(id: string, feedback: {
    type: 'agree' | 'too_optimistic' | 'too_conservative' | 'wrong_assumption' | 'missing_context';
    note?: string;
}) {
    // Get current thought
    const currentThought = await getThoughtById(id);

    if (!currentThought) {
        throw new Error('Thought not found');
    }

    // Mark old as not current
    await db.update(thoughts)
        .set({ isCurrent: false })
        .where(eq(thoughts.id, id));

    // Create new version with feedback
    const [newThought] = await db.insert(thoughts).values({
        ...currentThought,
        id: undefined as any, // Let DB generate new ID
        parentId: currentThought.id,
        feedbackType: feedback.type,
        feedbackNote: feedback.note,
        version: (currentThought.version || 1) + 1,
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    revalidatePath('/journal');
    revalidatePath('/history');
    return newThought;
}

// ============================================================================
// SEARCH & FILTER ACTIONS
// ============================================================================

export async function searchThoughts(params: {
    journalId?: string;
    query?: string;
    verdict?: string;
    minConfidence?: number;
    maxConfidence?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}): Promise<Thought[]> {
    const conditions = [eq(thoughts.isCurrent, true)];

    if (params.journalId) {
        conditions.push(eq(thoughts.journalId, params.journalId));
    }

    if (params.query) {
        conditions.push(
            or(
                like(thoughts.title, `%${params.query}%`),
                like(thoughts.content, `%${params.query}%`)
            )!
        );
    }

    if (params.verdict) {
        conditions.push(eq(thoughts.verdict, params.verdict as any));
    }

    if (params.minConfidence !== undefined) {
        conditions.push(gte(sql`CAST(${thoughts.confidence} AS DECIMAL)`, params.minConfidence.toString()));
    }

    if (params.maxConfidence !== undefined) {
        conditions.push(lte(sql`CAST(${thoughts.confidence} AS DECIMAL)`, params.maxConfidence.toString()));
    }

    if (params.startDate) {
        conditions.push(gte(thoughts.createdAt, params.startDate));
    }

    if (params.endDate) {
        conditions.push(lte(thoughts.createdAt, params.endDate));
    }

    return await db.select()
        .from(thoughts)
        .where(and(...conditions))
        .orderBy(desc(thoughts.createdAt))
        .limit(params.limit || 50)
        .offset(params.offset || 0);
}

// ============================================================================
// ANALYTICS & DASHBOARD ACTIONS
// ============================================================================

export async function getRecentThoughts(limit: number = 10): Promise<Thought[]> {
    const userId = await ensureUser();

    return await db.select()
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(
            and(
                eq(journals.userId, userId),
                eq(thoughts.isCurrent, true)
            )
        )
        .orderBy(desc(thoughts.createdAt))
        .limit(limit)
        .then(results => results.map(r => r.thoughts));
}

export async function getActiveDecisions() {
    const userId = await ensureUser();

    return await db.select()
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(
            and(
                eq(journals.userId, userId),
                eq(thoughts.isCurrent, true),
                or(
                    eq(thoughts.verdict, 'pursue'),
                    eq(thoughts.verdict, 'explore'),
                    eq(thoughts.verdict, 'watchlist')
                )!
            )
        )
        .orderBy(desc(thoughts.createdAt))
        .limit(10)
        .then(results => results.map(r => r.thoughts));
}

export async function getThoughtHistory(thoughtId: string) {
    return await db.select()
        .from(thoughts)
        .where(
            or(
                eq(thoughts.id, thoughtId),
                eq(thoughts.parentId, thoughtId)
            )!
        )
        .orderBy(desc(thoughts.version));
}

// ============================================================================
// STATS ACTIONS
// ============================================================================

export async function getDashboardStats() {
    const userId = await ensureUser();

    const userThoughts = await db.select()
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(
            and(
                eq(journals.userId, userId),
                eq(thoughts.isCurrent, true)
            )
        );

    const totalDecisions = userThoughts.length;
    const verdictCounts = userThoughts.reduce((acc, { thoughts: t }) => {
        const verdict = t.verdict || 'unknown';
        acc[verdict] = (acc[verdict] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        totalDecisions,
        verdictCounts,
        recentActivity: userThoughts.slice(0, 5).map(r => r.thoughts),
    };
}

// ============================================================================
// FOCUS SESSION ACTIONS
// ============================================================================

export async function startFocusSession(data: {
    thoughtId: string;
    actionItem: string;
    durationMinutes?: number;
}) {
    const userId = await ensureUser();

    const [session] = await db.insert(focusSessions).values({
        thoughtId: data.thoughtId,
        userId,
        title: 'Focus Session',
        actionItem: data.actionItem,
        durationMinutes: data.durationMinutes || 25,
        startedAt: new Date(),
    }).returning();

    revalidatePath('/focus');
    return session;
}

export async function completeFocusSession(id: string, outcome: string) {
    const [session] = await db.update(focusSessions)
        .set({
            completed: true,
            outcome,
            endedAt: new Date(),
        })
        .where(eq(focusSessions.id, id))
        .returning();

    revalidatePath('/focus');
    return session;
}
