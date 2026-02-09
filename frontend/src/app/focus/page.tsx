export const dynamic = 'force-dynamic';

import FocusClient, { FocusSession } from "./FocusClient";
import { getThought, getRecentThoughts } from "@/lib/actions";

export default async function FocusPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    let session: FocusSession | undefined;
    const thoughtId = searchParams.thought;

    if (thoughtId && typeof thoughtId === 'string') {
        const thought = await getThought(thoughtId);
        if (thought) {
            session = {
                id: thought.id,
                topic: thought.title,
                duration: 0,
                notes: [],
                originalVerdict: {
                    type: (thought.verdict || 'explore') as any,
                    confidence: thought.confidence ? parseFloat(thought.confidence) : 0,
                    date: thought.createdAt ? new Date(thought.createdAt).toLocaleDateString() : 'Unknown'
                },
                assumptions: (thought.context as any)?.assumptions || [],
                openQuestions: (thought.context as any)?.openQuestions || []
            };
        }
    }

    const availableThoughts = await getRecentThoughts(20);

    return <FocusClient initialSession={session} availableThoughts={availableThoughts} />;
}
