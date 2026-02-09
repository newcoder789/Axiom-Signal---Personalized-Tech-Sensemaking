"use client";

const PROMPTS = [
    { icon: '🤔', text: "I'm confused about...", category: 'confusion' },
    { icon: '🔍', text: "I'm curious about...", category: 'curiosity' },
    { icon: '⚖️', text: "I'm torn between...", category: 'decision' },
    { icon: '🎯', text: "I want to explore...", category: 'exploration' },
];

export default function ThinkingPrompts({ onSelect }: { onSelect: (text: string) => void }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {PROMPTS.map(prompt => (
                <button
                    key={prompt.category}
                    onClick={() => onSelect(prompt.text)}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50 text-left transition-all"
                >
                    <span className="text-lg flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        {prompt.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                        {prompt.text}
                    </span>
                </button>
            ))}
        </div>
    );
}
