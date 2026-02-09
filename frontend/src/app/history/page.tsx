export const dynamic = 'force-dynamic';

import HistoryClient, { HistoryEvent } from "./HistoryClient";
import { getFullHistory } from "@/lib/actions";

export default async function HistoryPage() {
    const rawHistory = await getFullHistory();

    // Transform into HistoryEvent format
    const events: HistoryEvent[] = rawHistory.map(({ thought, journalTitle }) => {
        let type: "decision" | "journal" | "revision" | "explore" = "journal";

        if (thought.parentId) {
            type = "revision";
        } else if (thought.verdict === 'explore') {
            type = "explore";
        } else if (thought.verdict) {
            type = "decision";
        }

        return {
            id: thought.id,
            type,
            date: thought.createdAt ? new Date(thought.createdAt).toLocaleDateString() : 'Unknown date',
            topic: thought.title,
            verdict: thought.verdict as any,
            confidence: thought.confidence ? parseFloat(thought.confidence) : undefined,
            reason: thought.reasoning || thought.content.slice(0, 100) + '...',
            journalSnippet: thought.content.slice(0, 150) + '...',
            linkedTo: thought.parentId ? "Previous Version" : undefined,
            // Revisions details would need parent lookup, simplifying for now
            revision: undefined
        };
    });

    return <HistoryClient events={events} />;
}
