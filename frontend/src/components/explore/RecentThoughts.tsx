import { getRecentThoughts } from "@/lib/actions";
import Link from "next/link";

export default async function RecentThoughts() {
    const thoughts = await getRecentThoughts(5);

    if (!thoughts || thoughts.length === 0) {
        return <div className="text-xs text-gray-500 py-2">No recent thoughts yet.</div>;
    }

    return (
        <div className="space-y-1">
            {thoughts.map(thought => (
                <Link
                    key={thought.id}
                    href={thought.verdict ? `/decide?thought=${thought.id}` : `/focus?thought=${thought.id}`}
                    className="group block px-2 py-2 rounded-md hover:bg-gray-800/60 transition-colors"
                >
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors line-clamp-1 flex-1">
                            {thought.title || "Untitled Thought"}
                        </span>
                        <span className="text-[10px] text-gray-600 whitespace-nowrap mt-0.5">
                            {thought.createdAt
                                ? new Date(thought.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : ''}
                        </span>
                    </div>
                    {thought.verdict && (
                        <span className={`inline-block mt-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${thought.verdict === 'pursue'
                                ? 'bg-emerald-500/10 text-emerald-400' :
                                thought.verdict === 'explore'
                                    ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-gray-800 text-gray-500'
                            }`}>
                            {thought.verdict}
                        </span>
                    )}
                </Link>
            ))}
        </div>
    );
}
