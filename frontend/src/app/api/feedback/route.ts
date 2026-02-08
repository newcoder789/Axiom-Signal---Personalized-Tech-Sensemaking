import { NextRequest, NextResponse } from "next/server";

// In-memory storage for demo
let feedbackStore: Feedback[] = [];

type Feedback = {
    id: string;
    entryId: string;
    topic: string;
    originalVerdict: string;
    feedbackType: "agree" | "disagree" | "too_optimistic" | "too_conservative";
    note?: string;
    timestamp: string;
    userId: string;
};

// POST - Store feedback
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userId = request.headers.get("x-user-id") || "demo-user";

        const feedback: Feedback = {
            id: Date.now().toString(),
            entryId: body.entryId,
            topic: body.topic,
            originalVerdict: body.originalVerdict,
            feedbackType: body.feedbackType,
            note: body.note,
            timestamp: new Date().toISOString(),
            userId,
        };

        feedbackStore.push(feedback);

        // Log for visibility (would go to memory system in production)
        console.log("[FEEDBACK] Stored:", feedback);

        return NextResponse.json({
            success: true,
            feedback,
            message: "Feedback stored. This will influence future verdicts for similar topics.",
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to store feedback" },
            { status: 500 }
        );
    }
}

// GET - Get feedback for a user
export async function GET(request: NextRequest) {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const topic = request.nextUrl.searchParams.get("topic");

    let feedback = feedbackStore.filter((f) => f.userId === userId);

    if (topic) {
        feedback = feedback.filter(
            (f) => f.topic.toLowerCase().includes(topic.toLowerCase())
        );
    }

    return NextResponse.json({
        feedback: feedback.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        count: feedback.length,
        // Compute adjustment hints based on feedback
        adjustments: computeAdjustments(feedback),
    });
}

function computeAdjustments(feedback: Feedback[]) {
    const adjustments: Record<string, { direction: string; count: number }> = {};

    for (const f of feedback) {
        const topic = f.topic.toLowerCase();
        if (!adjustments[topic]) {
            adjustments[topic] = { direction: "neutral", count: 0 };
        }

        adjustments[topic].count++;

        if (f.feedbackType === "too_conservative") {
            adjustments[topic].direction = "be_more_optimistic";
        } else if (f.feedbackType === "too_optimistic") {
            adjustments[topic].direction = "be_more_conservative";
        }
    }

    return adjustments;
}
