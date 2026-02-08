import { NextRequest, NextResponse } from 'next/server';
import { updateThoughtFeedback } from '@/lib/actions';
import { z } from 'zod';

// Feedback validation schema
const feedbackSchema = z.object({
    type: z.enum([
        'agree',
        'too_optimistic',
        'too_conservative',
        'wrong_assumption',
        'missing_context'
    ]),
    note: z.string().max(1000, 'Feedback note too long').optional(),
});

/**
 * POST /api/thoughts/[id]/feedback
 * 
 * Submit user feedback on a thought/verdict
 * Creates a new version of the thought with feedback attached
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const thoughtId = params.id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(thoughtId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid thought ID format',
                },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validated = feedbackSchema.parse(body);

        // Update thought with feedback (creates new version)
        const newThought = await updateThoughtFeedback(thoughtId, {
            type: validated.type,
            note: validated.note,
        });

        return NextResponse.json(
            {
                success: true,
                thought: newThought,
                message: 'Feedback recorded and new version created',
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('POST /api/thoughts/[id]/feedback error:', error);

        // Handle validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Handle not found
        if (error instanceof Error && error.message === 'Thought not found') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Thought not found',
                },
                { status: 404 }
            );
        }

        // Handle other errors
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to submit feedback',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
