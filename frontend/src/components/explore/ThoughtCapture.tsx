"use client";

import { useState, useEffect } from "react";
import { searchRelatedThoughts, createRawThought } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface ThoughtCaptureProps {
    content: string;
    onChange: (text: string) => void;
}

export default function ThoughtCapture({ content, onChange }: ThoughtCaptureProps) {
    const router = useRouter();
    const [related, setRelated] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (content.length > 10) {
                try {
                    const results = await searchRelatedThoughts(content);
                    setRelated(results);
                } catch (e) {
                    console.error("Search failed", e);
                }
            } else {
                setRelated([]);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [content]);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        try {
            await createRawThought(content);
            onChange("");
            setRelated([]);
            router.refresh();
        } catch (e) {
            console.error(e);
            alert("Failed to save thought");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDecide = () => {
        if (!content.trim()) return;
        router.push(`/decide?q=${encodeURIComponent(content)}&topic=${encodeURIComponent(content)}&source=explore`);
    };

    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="p-4">
                <textarea
                    className="w-full h-32 p-3 bg-gray-950/60 border border-gray-800 rounded-lg text-gray-200 placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/40 outline-none transition-all resize-none text-sm leading-relaxed"
                    placeholder="What's on your mind? What are you confused, curious, or unsure about?"
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                />

                {related.length > 0 && (
                    <div className="mt-3 bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
                        <h4 className="text-[11px] font-semibold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Related History
                        </h4>
                        <div className="space-y-1.5">
                            {related.map(t => (
                                <div key={t.id} className="text-xs text-gray-400 truncate hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1.5">
                                    <span className="text-gray-600">•</span>
                                    {t.title}
                                    {t.verdict && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                                            {t.verdict}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Action bar */}
            <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/30 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={!content.trim() || isSaving}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-white rounded-full"></span>
                                Saving...
                            </>
                        ) : (
                            <>💾 Save</>
                        )}
                    </button>
                    <button
                        onClick={() => alert("Quick Analysis coming soon!")}
                        disabled={!content.trim()}
                        className="px-3 py-1.5 text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
                    >
                        🧠 Analyze
                    </button>
                </div>
                <button
                    onClick={handleDecide}
                    disabled={!content.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    Decide Now →
                </button>
            </div>
        </div>
    );
}
