import { NextRequest, NextResponse } from 'next/server';
import { getRecentThoughts } from '@/lib/actions';

/**
 * GET /api/thoughts/recent
 * Get recent thoughts
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const thoughts = await getRecentThoughts(limit);

        return NextResponse.json({
            success: true,
            thoughts,
        });
    } catch (error) {
        console.error('GET /api/thoughts/recent error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch thoughts',
            },
            { status: 500 }
        );
    }
}
