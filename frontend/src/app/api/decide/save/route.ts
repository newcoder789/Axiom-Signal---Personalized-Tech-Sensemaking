import { NextRequest, NextResponse } from 'next/server';
import { createThought } from '@/lib/actions';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            journalId,
            title,
            content,
            verdict,
            confidence,
            reasoning,
            actionItems,
            reasonCodes,
            toolEvidence,
            sources
        } = body;

        if (!journalId || !title) {
            return NextResponse.json(
                { error: 'journalId and title are required' },
                { status: 400 }
            );
        }

        // Create thought with verdict data
        const thought = await createThought({
            journalId,
            title,
            content: content || '',
            verdict: verdict || null,
            confidence: confidence || null,
            metadata: {
                reasoning,
                actionItems,
                reasonCodes,
                toolEvidence,
                sources,
                savedAt: new Date().toISOString()
            }
        });

        return NextResponse.json({
            success: true,
            thought
        });
    } catch (error) {
        console.error('Failed to save decision:', error);
        return NextResponse.json(
            { error: 'Failed to save decision' },
            { status: 500 }
        );
    }
}
