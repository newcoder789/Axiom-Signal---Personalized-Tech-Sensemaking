import { getJournals } from "@/lib/actions";
import Link from "next/link";

export default async function JournalList() {
    const journals = await getJournals();

    if (!journals || journals.length === 0) {
        return <div className="text-xs text-gray-500 py-2">No journals yet.</div>;
    }

    return (
        <div className="space-y-1">
            {journals.map(journal => (
                <Link
                    key={journal.id}
                    href={`/journal/${journal.id}`}
                    className="group flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-gray-800/60 transition-colors"
                >
                    <span className="text-base flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        {journal.icon || "📓"}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 group-hover:text-white transition-colors truncate">
                            {journal.title}
                        </div>
                        <div className="text-[10px] text-gray-600">
                            {journal.thoughtCount || 0} thought{(journal.thoughtCount || 0) !== 1 ? 's' : ''}
                        </div>
                    </div>
                </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-800">
                <Link
                    href="/journal"
                    className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors py-1"
                >
                    + Create New Journal
                </Link>
            </div>
        </div>
    );
}
