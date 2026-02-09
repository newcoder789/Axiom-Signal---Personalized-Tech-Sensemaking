'use server';

import { db } from './db';
import { journals, thoughts, beliefs, tags, thoughtTags, focusSessions, users } from './schema';
import type { NewJournal, NewThought, Thought, Journal } from './schema';
import { eq, and, desc, like, or, sql, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { ThoughtSchema } from './validation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ============================================================================
// USER ACTIONS
// ============================================================================

export async function getCurrentUserId(): Promise<string> {
    return ensureUser();
}

export async function ensureUser() {
    const session = await getServerSession(authOptions);

    // If authenticated, use that user
    if (session?.user?.id) {
        return session.user.id;
    }

    // ⚠️ Fallback to Demo User if not logged in
    // This allows "Guest Mode" for the hackathon
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
            email: `guest@axiom.local`,
            name: 'Guest User',
            emailVerified: new Date(),
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

    const baseSlug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;

    // Ensure slug is unique
    const existingJournal = await db.query.journals.findFirst({
        where: eq(journals.slug, slug)
    });

    if (existingJournal) {
        // Append random suffix if slug exists
        slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    }

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

export async function getJournals() {
    const userId = await ensureUser();

    return await db.select({
        id: journals.id,
        title: journals.title,
        icon: journals.icon,
        description: journals.description,
        color: journals.color,
        thoughtCount: sql<number>`count(${thoughts.id})`.mapWith(Number)
    })
        .from(journals)
        .leftJoin(thoughts, and(eq(journals.id, thoughts.journalId), eq(thoughts.isCurrent, true)))
        .where(
            and(
                eq(journals.userId, userId),
                eq(journals.isArchived, false)
            )
        )
        .groupBy(journals.id, journals.title, journals.icon, journals.description, journals.color)
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
    journalId?: string;
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
    // Validate inputs
    try {
        ThoughtSchema.parse({
            title: data.title,
            content: data.content,
            context: data.context
        });
    } catch (error) {
        console.error("Validation error:", error);
    }

    let journalId = data.journalId;

    if (!journalId) {
        const userId = await ensureUser();
        // Get a default journal or the first one
        const userJournals = await db.select().from(journals).where(eq(journals.userId, userId)).limit(1);
        journalId = userJournals[0]?.id;

        // If no journal, create a generic one
        if (!journalId) {
            const [newJournal] = await db.insert(journals).values({
                userId,
                title: "General Thoughts",
                icon: "📓",
            }).returning();
            journalId = newJournal.id;
        }
    }

    const [thought] = await db.insert(thoughts).values({
        journalId,
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
        revalidatePath(`/journal/${journalId}`);
    }
    return thought;
}

export async function persistVerdict(verdictData: any) {
    // Determine title from topic or content
    const title = verdictData.topic || "New Analysis";

    // Create the thought
    return await createThought({
        title,
        content: verdictData.additional_notes || verdictData.content || title, // Fallback content
        verdict: verdictData.verdict,
        confidence: verdictData.confidence,
        reasoning: verdictData.reasoning,
        timeline: verdictData.timeline,
        actionItems: Array.isArray(verdictData.actionItems)
            ? verdictData.actionItems.map((item: any) =>
                typeof item === 'string' ? { text: item, completed: false } : { text: item.text, completed: false }
            )
            : [],
        toolEvidence: verdictData.toolEvidence,
        sources: verdictData.sources,
        context: {
            profile: verdictData.user_profile,
            riskTolerance: verdictData.risk_tolerance,
        }
    });
}

// ... (other functions remain)

export async function getThoughtEvolution(id: string): Promise<Thought[]> {
    const currentThought = await getThoughtById(id);

    if (!currentThought) return [];

    // Get all versions by following parent chain
    const versions: Thought[] = [];
    let current: Thought | null = currentThought;

    // Prevent infinite loops with max depth
    let depth = 0;
    const MAX_DEPTH = 50;

    while (current && depth < MAX_DEPTH) {
        versions.unshift(current); // Add to beginning (oldest first)

        if (!current.parentId) break;

        const [parent] = await db.select()
            .from(thoughts)
            .where(eq(thoughts.id, current.parentId))
            .limit(1);

        current = parent || null;
        depth++;
    }

    return versions;
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



export async function getActiveDecisions(limit: number = 10) {
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
        .orderBy(desc(thoughts.updatedAt)) // Should be updatedAt for activity? Or createdAt.
        .limit(limit)
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

export async function getFullHistory() {
    const userId = await ensureUser();

    // Join with journals to ensure we only get this user's data
    const results = await db.select({
        thought: thoughts,
        journalTitle: journals.title
    })
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(eq(journals.userId, userId))
        .orderBy(desc(thoughts.createdAt));

    return results;
}

export async function getThought(id: string) {
    const userId = await ensureUser(); // ensure access
    const result = await db.query.thoughts.findFirst({
        where: eq(thoughts.id, id),
    });
    // Optional: check ownership via journal join if strict (but ensureUser checks logged in)
    // For now, assuming if you have ID you can read it (or add check)
    return result;
}

export async function getRecentThoughts(limit: number = 5) {
    const userId = await ensureUser();
    return await db.select({
        id: thoughts.id,
        title: thoughts.title,
        verdict: thoughts.verdict,
        createdAt: thoughts.createdAt,
        content: thoughts.content
    })
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(
            and(
                eq(journals.userId, userId),
                eq(thoughts.isCurrent, true)
            )
        )
        .orderBy(desc(thoughts.createdAt))
        .limit(limit);
}

export async function searchRelatedThoughts(query: string) {
    const userId = await ensureUser();
    return await db.select({
        id: thoughts.id,
        title: thoughts.title,
        verdict: thoughts.verdict
    })
        .from(thoughts)
        .innerJoin(journals, eq(thoughts.journalId, journals.id))
        .where(
            and(
                eq(journals.userId, userId),
                like(thoughts.content, `%${query}%`)
            )
        )
        .orderBy(desc(thoughts.createdAt))
        .limit(3);
}

export async function createRawThought(content: string) {
    const userId = await ensureUser();

    // Get a default journal or the first one
    const userJournals = await db.select().from(journals).where(eq(journals.userId, userId)).limit(1);
    let journalId = userJournals[0]?.id;

    // If no journal, create a generic one
    if (!journalId) {
        const [newJournal] = await db.insert(journals).values({
            userId,
            title: "General Thoughts",
            icon: "📓",
        }).returning();
        journalId = newJournal.id;
    }

    const [thought] = await db.insert(thoughts).values({
        journalId,
        title: content.slice(0, 50) + (content.length > 50 ? "..." : ""), // Simple title extraction
        content,
        isCurrent: true,
        verdict: null, // Raw thought
    }).returning();

    return thought;
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



export async function updateThoughtFeedback(thoughtId: string, feedback: {
    helpful: boolean;
    tags: string[];
    comments?: string;
}) {
    await db.update(thoughts)
        .set({
            feedback: {
                ...feedback,
                timestamp: new Date().toISOString()
            }
        })
        .where(eq(thoughts.id, thoughtId));

    revalidatePath('/decide');
    revalidatePath('/journal');
    return { success: true };
}
