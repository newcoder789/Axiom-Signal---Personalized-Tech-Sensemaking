import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { thoughts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { title, content, verdict, confidence, reasoning, actionItems, reasonCodes } = body;

        const [updatedThought] = await db.update(thoughts)
            .set({
                title,
                content,
                verdict,
                confidence: confidence?.toString(),
                reasoning,
                actionItems,
                reasonCodes,
                updatedAt: new Date(),
            })
            .where(eq(thoughts.id, (await params).id))
            .returning();

        return NextResponse.json(updatedThought);
    } catch (error) {
        console.error('Failed to update thought:', error);
        return NextResponse.json(
            { error: 'Failed to update thought' },
            { status: 500 }
        );
    }
}
