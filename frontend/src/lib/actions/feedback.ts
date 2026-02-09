'use server';

import { db } from '@/lib/db';
import { feedback, thoughts, feedbackAdjustments } from '@/lib/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { FeedbackRequest } from '@/lib/types/feedback';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Helper to ensure user is authenticated
async function ensureUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        // Fallback to demo user for hackathon if needed, matching actions.ts behavior
        return '00000000-0000-0000-0000-000000000001';
    }
    return session.user.id;
}

export async function submitFeedback(feedbackData: FeedbackRequest) {
    const userId = await ensureUser();

    // Start transaction
    const result = await db.transaction(async (tx) => {
        // 1. Save feedback
        const [newFeedback] = await tx.insert(feedback).values({
            thoughtId: feedbackData.thoughtId,
            userId: userId,
            isTooOptimistic: feedbackData.tags.isTooOptimistic || false,
            isTooConservative: feedbackData.tags.isTooConservative || false,
            hasWrongAssumption: feedbackData.tags.hasWrongAssumption || false,
            missingContext: feedbackData.tags.missingContext || false,
            isCorrect: feedbackData.tags.isCorrect || false,
            correctedVerdict: feedbackData.corrections?.verdict,
            correctedConfidence: feedbackData.corrections?.confidence ? String(feedbackData.corrections.confidence) : null,
            correctedTimeline: feedbackData.corrections?.timeline,
            comment: feedbackData.comment,
        }).returning();

        // 2. Update thought feedback count
        await tx.update(thoughts)
            .set({
                feedbackCount: sql`${thoughts.feedbackCount} + 1`,
            })
            .where(eq(thoughts.id, feedbackData.thoughtId));

        // 3. Calculate adjustment impact
        const adjustment = calculateConfidenceAdjustment(feedbackData);

        // 4. Save adjustment for future analyses
        await tx.insert(feedbackAdjustments).values({
            userId: userId,
            feedbackId: newFeedback.id,
            adjustmentValue: String(adjustment),
            adjustmentType: getAdjustmentType(feedbackData.tags),
            appliedToFutureAnalyses: true,
        });

        // 5. If wrong assumption, create new version with corrections
        if (feedbackData.tags.hasWrongAssumption && feedbackData.corrections) {
            await createCorrectedThoughtVersion(
                tx,
                feedbackData.thoughtId,
                feedbackData.corrections
            );
        }

        return newFeedback;
    });

    // Invalidate cache
    revalidatePath(`/decide/${feedbackData.thoughtId}`);
    revalidatePath('/decide');

    return result;
}

function calculateConfidenceAdjustment(feedback: FeedbackRequest): number {
    let adjustment = 0;

    if (feedback.tags.isTooOptimistic) adjustment -= 0.15;
    if (feedback.tags.isTooConservative) adjustment += 0.1;
    if (feedback.tags.hasWrongAssumption) adjustment -= 0.25;
    if (feedback.tags.missingContext) adjustment -= 0.05;
    if (feedback.tags.isCorrect) adjustment += 0.05;

    // Clamp between -0.3 and +0.2
    return Math.max(-0.3, Math.min(0.2, adjustment));
}

function getAdjustmentType(tags: FeedbackRequest['tags']): string {
    if (tags.hasWrongAssumption) return 'wrong_assumption';
    if (tags.isTooOptimistic) return 'too_optimistic';
    if (tags.isTooConservative) return 'too_conservative';
    if (tags.missingContext) return 'missing_context';
    return 'general_feedback';
}

async function createCorrectedThoughtVersion(
    tx: any,
    thoughtId: string,
    corrections: FeedbackRequest['corrections']
) {
    if (!corrections) return;

    const [originalThought] = await tx.select()
        .from(thoughts)
        .where(eq(thoughts.id, thoughtId));

    if (!originalThought) return;

    // Mark old as not current
    await tx.update(thoughts)
        .set({ isCurrent: false })
        .where(eq(thoughts.id, thoughtId));

    // Create corrected version
    const [correctedThought] = await tx.insert(thoughts).values({
        journalId: originalThought.journalId,
        parentId: thoughtId,
        title: originalThought.title,
        content: originalThought.content,
        context: originalThought.context,
        verdict: corrections.verdict || originalThought.verdict,
        confidence: corrections.confidence ? String(corrections.confidence) : originalThought.confidence,
        timeline: corrections.timeline || originalThought.timeline,
        reasoning: `Corrected based on user feedback: ${originalThought.reasoning}`,
        actionItems: originalThought.actionItems,
        version: (originalThought.version || 1) + 1,
        isCurrent: true,
    }).returning();

    return correctedThought;
}

// Apply user feedback to new analyses
export async function applyFeedbackToAnalysis(
    userId: string,
    topic: string,
    context: any
): Promise<{ adjustment: number; feedbackCount: number }> {
    // Use a simplified logic for now as pg_trgm might not be enabled for similarity
    // Just get recent feedback adjustments
    const recentAdjustments = await db.select()
        .from(feedbackAdjustments)
        .innerJoin(feedback, eq(feedbackAdjustments.feedbackId, feedback.id))
        .where(
            and(
                eq(feedbackAdjustments.userId, userId),
                eq(feedbackAdjustments.appliedToFutureAnalyses, true)
            )
        )
        .orderBy(desc(feedbackAdjustments.createdAt))
        .limit(10);

    if (recentAdjustments.length === 0) {
        return { adjustment: 0, feedbackCount: 0 };
    }

    // Calculate average adjustment
    const totalAdjustment = recentAdjustments.reduce((sum, adj) => {
        return sum + parseFloat(adj.feedback_adjustments.adjustmentValue as string);
    }, 0);

    const averageAdjustment = totalAdjustment / recentAdjustments.length;

    return {
        adjustment: averageAdjustment,
        feedbackCount: recentAdjustments.length,
    };
}

export async function getFeedbackStats(timeRange: string = '30d') {
    const userId = await ensureUser();
    const dateThreshold = new Date();

    if (timeRange === '7d') dateThreshold.setDate(dateThreshold.getDate() - 7);
    else if (timeRange === '30d') dateThreshold.setDate(dateThreshold.getDate() - 30);
    else if (timeRange === '90d') dateThreshold.setDate(dateThreshold.getDate() - 90);

    const feedbackItems = await db.select()
        .from(feedback)
        .where(
            and(
                eq(feedback.userId, userId),
                sql`${feedback.createdAt} >= ${dateThreshold.toISOString()}`
            )
        )
        .orderBy(desc(feedback.createdAt));

    const totalFeedback = feedbackItems.length;

    const tagDistribution = {
        tooOptimistic: feedbackItems.filter(f => f.isTooOptimistic).length,
        tooConservative: feedbackItems.filter(f => f.isTooConservative).length,
        wrongAssumption: feedbackItems.filter(f => f.hasWrongAssumption).length,
        missingContext: feedbackItems.filter(f => f.missingContext).length,
        correct: feedbackItems.filter(f => f.isCorrect).length,
    };

    // Calculate accuracy trend (moving average of isCorrect)
    // This is checking if 'isCorrect' is true for the last N items
    // If multiple feedbacks are submitted, accuracy might be hard to define per item
    // Let's simplified assumption: isCorrect = 100%, others = 0% for trend

    // We want reversed array to show trend over time (oldest to newest)
    const sortedFeedback = [...feedbackItems].reverse();
    const accuracyTrend = sortedFeedback.map(f => f.isCorrect ? 1.0 : 0.0);

    // Issue frequency
    const issueFrequency: Record<string, number> = {
        'Optimism Bias': tagDistribution.tooOptimistic,
        ' conservatism Bias': tagDistribution.tooConservative,
        'Wrong Assumptions': tagDistribution.wrongAssumption,
        'Missing Context': tagDistribution.missingContext,
    };

    const mostCommonIssues = Object.entries(issueFrequency)
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => key);

    const adjustments = await db.select()
        .from(feedbackAdjustments)
        .where(eq(feedbackAdjustments.userId, userId));

    const avgAdjustment = adjustments.length > 0
        ? adjustments.reduce((sum, a) => sum + parseFloat(a.adjustmentValue as string), 0) / adjustments.length
        : 0;

    return {
        totalFeedback,
        tagDistribution,
        accuracyTrend, // Array of 0s and 1s
        mostCommonIssues,
        issueFrequency,
        averageAdjustment: avgAdjustment.toFixed(3),
    };
}
