import { NextRequest, NextResponse } from 'next/server';
import { getJournals } from '@/lib/actions';

/**
 * GET /api/journals
 * Get all journals for the current user
 */
export async function GET() {
    try {
        const journals = await getJournals();

        return NextResponse.json({
            success: true,
            journals,
        });
    } catch (error) {
        console.error('GET /api/journals error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch journals',
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/journals
 * Create a new journal
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { createJournal } = await import('@/lib/actions');

        const journal = await createJournal({
            title: body.title,
            description: body.description,
            color: body.color,
            icon: body.icon,
        });

        return NextResponse.json({
            success: true,
            journal,
        });
    } catch (error) {
        console.error('POST /api/journals error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create journal',
            },
            { status: 500 }
        );
    }
}
