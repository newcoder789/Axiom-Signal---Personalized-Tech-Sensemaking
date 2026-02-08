import { NextRequest, NextResponse } from "next/server";
import { getJournals, createJournal } from '@/lib/actions';

// GET - Fetch all journals from database
export async function GET(request: NextRequest) {
    try {
        const journals = await getJournals();

        return NextResponse.json({
            journals,
            count: journals.length,
        });
    } catch (error) {
        console.error('Failed to fetch journals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch journals' },
            { status: 500 }
        );
    }
}

// POST - Create new journal
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title) {
            return NextResponse.json(
                { error: 'title is required' },
                { status: 400 }
            );
        }

        const journal = await createJournal({
            title: body.title,
            description: body.description || null,
            icon: body.icon || '📓',
            color: body.color || '#3B82F6',
        });

        return NextResponse.json({ journal }, { status: 201 });
    } catch (error) {
        console.error('Failed to create journal:', error);
        return NextResponse.json(
            { error: 'Failed to create journal' },
            { status: 500 }
        );
    }
}
