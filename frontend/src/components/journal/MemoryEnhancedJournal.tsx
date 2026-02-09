"use client";

import { useState, useEffect, useCallback } from 'react';
import { memoryService, MemoryMatch } from '@/lib/memory';
import { useDebounce } from 'use-debounce';
import { Brain, Lightbulb, History, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface MemoryEnhancedJournalProps {
    value: string;
    onChange: (value: string) => void;
    userProfile?: string;
    placeholder?: string;
}

export function MemoryEnhancedJournal({
    value,
    onChange,
    userProfile = "Developer",
    placeholder = "What's on your mind? Axiom will find related memories..."
}: MemoryEnhancedJournalProps) {
    const [debouncedValue] = useDebounce(value, 800);
    const [matches, setMatches] = useState<MemoryMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [axiomHints, setAxiomHints] = useState<string[]>([]);

    // Active Memory Search
    useEffect(() => {
        if (debouncedValue.length < 10) {
            setMatches([]);
            setAxiomHints([]);
            return;
        }

        const searchMemory = async () => {
            setIsSearching(true);
            const results = await memoryService.search(debouncedValue, userProfile);
            setMatches(results);

            // Generate active hints based on results
            generateActiveHints(results);
            setIsSearching(false);
        };

        searchMemory();
    }, [debouncedValue, userProfile]);

    const generateActiveHints = (results: MemoryMatch[]) => {
        const hints: string[] = [];

        // Check for contradictions or patterns
        const ignoreCount = results.filter(m => m.verdict === 'ignore').length;
        const pursueCount = results.filter(m => m.verdict === 'pursue').length;

        if (ignoreCount > 0 && pursueCount > 0) {
            hints.push("You have conflicting past decisions on similar topics.");
        }

        if (results.some(m => m.type === 'pattern' && m.text.includes('hype'))) {
            hints.push("CAUTION: This topic matches a known 'hype' pattern from your history.");
        }

        setAxiomHints(hints);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Main Journal Area */}
            <div className="md:col-span-2 flex flex-col h-full">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-96 p-6 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg leading-relaxed"
                />
                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                    <span>{value.length} chars</span>
                    <span className="flex items-center gap-1">
                        {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isSearching ? "Searching memory..." : "Memory active"}
                    </span>
                </div>
            </div>

            {/* Active Memory Sidebar */}
            <div className="md:col-span-1 space-y-4">

                {/* Axiom Hints (Proactive) */}
                {axiomHints.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-2 mb-2 text-amber-700 font-medium">
                            <Lightbulb className="w-4 h-4" />
                            <span>Axiom Insights</span>
                        </div>
                        <ul className="space-y-2">
                            {axiomHints.map((hint, i) => (
                                <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                    <span className="mt-1">•</span>
                                    {hint}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Memory Matches (Context) */}
                {matches.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium uppercase tracking-wider">
                            <Brain className="w-4 h-4" />
                            <span>Related Memories</span>
                        </div>

                        {matches.map((match) => (
                            <div key={match.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${match.verdict === 'pursue' ? 'bg-green-100 text-green-700' :
                                        match.verdict === 'ignore' ? 'bg-red-100 text-red-700' :
                                            match.type === 'pattern' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {match.verdict || match.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{Math.round(match.confidence * 100)}% conf</span>
                                </div>
                                <p className="text-sm text-gray-700 font-medium line-clamp-2">{match.text}</p>
                                {match.type === 'pattern' && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                                        <History className="w-3 h-3" />
                                        <span>Historical Pattern</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Start typing to activate active memory recall...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
