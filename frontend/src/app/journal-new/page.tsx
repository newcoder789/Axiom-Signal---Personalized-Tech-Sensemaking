"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Save } from "lucide-react";
import { createThought } from "@/lib/actions";
import { MemoryEnhancedJournal } from "@/components/journal/MemoryEnhancedJournal";

export default function NewThoughtPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        verdict: "explore" as const,
    });

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) return;

        setIsSubmitting(true);
        try {
            await createThought({
                title: formData.title,
                content: formData.content,
                verdict: "explore",
                // source: "manual", // Removed as not in type definition
            });
            router.push("/journal");
            router.refresh();
        } catch (error) {
            console.error("Failed to create thought:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-serif text-gray-900">New Thought</h1>
                            <p className="text-sm text-gray-500">Capture what's on your mind</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.title || !formData.content}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>Save to Journal</span>
                    </button>
                </div>

                {/* Editor Area */}
                <div className="space-y-6">
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                            setFormData((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Give this thought a title..."
                        className="w-full text-4xl font-serif bg-transparent border-none focus:ring-0 placeholder:text-gray-300 px-0"
                        autoFocus
                    />

                    <div className="prose prose-lg max-w-none">
                        <MemoryEnhancedJournal
                            value={formData.content}
                            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                            placeholder="Start writing... Axiom will find relevant memories and patterns as you type."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
