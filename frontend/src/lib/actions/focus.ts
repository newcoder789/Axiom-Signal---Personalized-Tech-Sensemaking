'use server';

import { db } from '../db';
import { focusSessions, focusMetrics, focusHabits, thoughts } from '../schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { ensureUser, createThought } from '../actions';
import { revalidatePath } from 'next/cache';

export async function startFocusSession(data: {
    thoughtId: string;
    title: string;
    actionItems: Array<{ id: string; text: string; completed: boolean }>;
    durationMinutes?: number;
}) {
    const userId = await ensureUser();

    const [session] = await db.insert(focusSessions).values({
        thoughtId: data.thoughtId,
        userId,
        title: data.title,
        actionItems: data.actionItems,
        targetDurationMinutes: data.durationMinutes || 25,
        status: 'in_progress',
        actualStartTime: new Date(),
        plannedStartTime: new Date(),
    }).returning();

    revalidatePath('/focus');
    return session;
}

export async function updateSessionProgress(sessionId: string, data: {
    completedActionCount: number;
    totalActionCount: number;
    actionItems: Array<{ id: string; text: string; completed: boolean }>;
}) {
    const progressPercent = data.totalActionCount > 0
        ? (data.completedActionCount / data.totalActionCount) * 100
        : 0;

    await db.update(focusSessions)
        .set({
            completedActionCount: data.completedActionCount,
            totalActionCount: data.totalActionCount,
            actionItems: data.actionItems,
            progressPercent: progressPercent.toString(),
            updatedAt: new Date(),
        })
        .where(eq(focusSessions.id, sessionId));

    revalidatePath(`/focus/${sessionId}`);
}

export async function completeFocusSession(id: string, data: {
    outcome: 'completed' | 'drifted' | 'abandoned' | 'successful';
    notes?: string;
    actualDurationMinutes?: number;
    focusScore?: number;
    productivityScore?: number;
}) {
    const userId = await ensureUser();

    const [session] = await db.update(focusSessions)
        .set({
            status: 'completed',
            outcomeType: data.outcome,
            outcomeNotes: data.notes,
            actualDurationMinutes: data.actualDurationMinutes,
            actualEndTime: new Date(),
            focusScore: data.focusScore?.toString(),
            productivityScore: data.productivityScore?.toString(),
        })
        .where(eq(focusSessions.id, id))
        .returning();

    // Update habits/streaks
    await updateFocusHabits(userId, session);

    // Auto-journaling: Create a thought entry for this session
    if (session && session.thoughtId) {
        // Fetch original thought title for context
        const originalThought = await db.query.thoughts.findFirst({
            where: eq(thoughts.id, session.thoughtId),
            columns: { title: true, journalId: true }
        });

        if (originalThought) {
            await createThought({
                journalId: originalThought.journalId || undefined,
                title: `Focus Session: ${session.title}`,
                content: `Outcome: ${data.outcome}\n\nNotes: ${data.notes || 'No notes provided.'}\n\nDuration: ${data.actualDurationMinutes} min\nProductivity Score: ${data.productivityScore || 'N/A'}`,
                verdict: 'archive', // Mark as archive/log
                context: {
                    sessionId: session.id,
                    originalThoughtId: session.thoughtId,
                    type: 'auto_journal'
                },
                confidence: 100, // Fact
                timeline: 'completed',
                sources: []
            });
        }
    }

    revalidatePath('/focus');
    return session;
}

async function updateFocusHabits(userId: string, session: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habits = await db.query.focusHabits.findFirst({
        where: eq(focusHabits.userId, userId)
    });

    if (!habits) {
        await db.insert(focusHabits).values({
            userId,
            currentStreak: 1,
            longestStreak: 1,
            totalSessions: 1,
            totalFocusMinutes: session.actualDurationMinutes || 0,
            lastSessionDate: new Date(),
        });
        return;
    }

    const lastDate = habits.lastSessionDate ? new Date(habits.lastSessionDate) : new Date(0);
    lastDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let newStreak = habits.currentStreak || 0;

    if (diffDays === 1) {
        newStreak += 1; // Consecutive day
    } else if (diffDays > 1) {
        newStreak = 1; // Broken streak
    }
    // If diffDays === 0, same day, streak doesn't increase but minutes do

    await db.update(focusHabits)
        .set({
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, habits.longestStreak || 0),
            totalSessions: (habits.totalSessions || 0) + 1,
            totalFocusMinutes: (habits.totalFocusMinutes || 0) + (session.actualDurationMinutes || 0),
            lastSessionDate: new Date(),
        })
        .where(eq(focusHabits.userId, userId));
}

export async function getFocusSession(id: string) {
    return await db.query.focusSessions.findFirst({
        where: eq(focusSessions.id, id)
    });
}

export async function getFocusStats() {
    const userId = await ensureUser();

    // Get habits
    const habits = await db.query.focusHabits.findFirst({
        where: eq(focusHabits.userId, userId)
    });

    // Get recent sessions
    const recentSessions = await db.select()
        .from(focusSessions)
        .where(eq(focusSessions.userId, userId))
        .orderBy(desc(focusSessions.createdAt))
        .limit(5);

    return {
        habits: habits || {
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            totalFocusMinutes: 0
        },
        recentSessions
    };
}

export async function getActiveFocusSession() {
    const userId = await ensureUser();
    return await db.query.focusSessions.findFirst({
        where: and(
            eq(focusSessions.userId, userId),
            eq(focusSessions.status, 'in_progress')
        ),
        orderBy: desc(focusSessions.createdAt)
    });
}
