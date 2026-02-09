import { NextRequest, NextResponse } from 'next/server';
import { createThought } from '@/lib/actions';
import { z } from 'zod';

const createThoughtSchema = z.object({
    journalId: z.string().uuid().optional(),
    title: z.string().min(1),
    content: z.string(),
    verdict: z.enum(['pursue', 'explore', 'watchlist', 'ignore', 'archive']).optional(),
    confidence: z.number().min(0).max(100).optional(),
    reasoning: z.string().optional(),
    timeline: z.string().optional(),
    actionItems: z.array(z.object({
        text: z.string(),
        completed: z.boolean(),
    })).optional(),
    reasonCodes: z.array(z.string()).optional(),
    toolEvidence: z.any().optional(),
    sources: z.array(z.any()).optional(),
});

/**
 * POST /api/thoughts
 * Create a new thought in a journal
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = createThoughtSchema.parse(body);

        const thought = await createThought({
            journalId: validated.journalId,
            title: validated.title,
            content: validated.content,
            verdict: validated.verdict,
            confidence: validated.confidence,
            reasoning: validated.reasoning,
            timeline: validated.timeline,
            actionItems: validated.actionItems,
            reasonCodes: validated.reasonCodes,
            toolEvidence: validated.toolEvidence,
            sources: validated.sources,
        });

        return NextResponse.json({
            success: true,
            thought,
        });
    } catch (error) {
        console.error('POST /api/thoughts error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create thought',
            },
            { status: 500 }
        );
    }
}
