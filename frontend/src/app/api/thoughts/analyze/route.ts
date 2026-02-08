import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const analyzeRequestSchema = z.object({
    topic: z.string().min(1),
    content: z.string().optional(),
    context: z.object({
        riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
        timeHorizon: z.string().optional(),
        experienceLevel: z.string().optional(), // Changed from enum to string
        profile: z.string().optional(),
        additionalContext: z.string().optional(), // Added new field
    }).optional(),
});

/**
 * POST /api/thoughts/analyze
 * Analyzes a decision topic using Axiom backend (tools + memory)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = analyzeRequestSchema.parse(body);

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

        console.log('🔍 Analyzing thought:', validatedData.topic);
        console.log('📋 Context:', validatedData.context);

        try {
            const response = await fetch(`${backendUrl}/api/verdict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: validatedData.topic,
                    content: validatedData.content || validatedData.context?.additionalContext || '',
                    context: validatedData.context || {},
                }),
            });

            if (!response.ok) {
                console.error('Backend error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Backend response:', errorText);
                throw new Error(`Backend returned ${response.status}`);
            }

            const backendResult = await response.json();

            console.log('✅ Backend verdict:', backendResult.verdict);

            return NextResponse.json({
                success: true,
                verdict: backendResult.verdict,
                confidence: backendResult.confidence,
                reasoning: backendResult.reasoning,
                timeline: backendResult.timeline,
                actionItems: backendResult.actionItems || [],
                reasonCodes: backendResult.reasonCodes || [],
                toolEvidence: backendResult.toolEvidence || {},
                sources: backendResult.sources || null,
                relevanceScore: backendResult.relevanceScore || 0,
            });

        } catch (backendError) {
            console.error('Axiom backend error:', backendError);

            // Fallback response
            console.log('⚠️  Using fallback analysis');

            return NextResponse.json({
                success: true,
                verdict: 'explore',
                confidence: 0.5,
                reasoning: `Analyzing "${validatedData.topic}": Backend temporarily unavailable. This is a fallback assessment. The topic appears technically interesting and worth exploring further.`,
                timeline: 'in 3 months',
                actionItems: [
                    { text: 'Research current state and trends', completed: false },
                    { text: 'Identify 2-3 practical applications', completed: false },
                ],
                reasonCodes: ['FALLBACK_MODE'],
                toolEvidence: {},
                sources: null,
                relevanceScore: 0,
            });
        }

    } catch (error) {
        console.error('POST /api/thoughts/analyze error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid request format', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to analyze thought' },
            { status: 500 }
        );
    }
}
