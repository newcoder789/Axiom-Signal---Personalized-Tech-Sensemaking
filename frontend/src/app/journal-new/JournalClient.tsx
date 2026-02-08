'use client';

import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Journal, Thought } from '@/lib/schema';

interface JournalClientProps {
    journals: Journal[];
    initialThoughts: Thought[];
}

export default function JournalClient({ journals, initialThoughts }: JournalClientProps) {
    const [thoughts, setThoughts] = useState(initialThoughts);
    const [selectedThought, setSelectedThought] = useState<Thought | null>(
        initialThoughts[0] || null
    );

    const getVerdictColor = (verdict: string) => {
        const colors: Record<string, string> = {
            pursue: 'bg-green-100 text-green-800',
            explore: 'bg-blue-100 text-blue-800',
            watchlist: 'bg-yellow-100 text-yellow-800',
            ignore: 'bg-gray-100 text-gray-800',
        };
        return colors[verdict] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Sidebar - Thought List */}
            <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Your Thoughts</h2>
                    <p className="text-sm text-gray-600 mt-1">{thoughts.length} entries</p>
                </div>

                <div className="p-4 space-y-2">
                    {thoughts.map((thought) => (
                        <button
                            key={thought.id}
                            onClick={() => setSelectedThought(thought)}
                            className={`w-full text-left p-4 rounded-lg transition-colors ${selectedThought?.id === thought.id
                                ? 'bg-blue-50 border-2 border-blue-500'
                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                }`}
                        >
                            <h3 className="font-medium text-gray-900 line-clamp-1">{thought.title}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{thought.content}</p>
                            <div className="flex items-center justify-between mt-2">
                                {thought.verdict && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${getVerdictColor(thought.verdict)}`}>
                                        {thought.verdict.toUpperCase()}
                                    </span>
                                )}
                                <span className="text-xs text-gray-500">
                                    {new Date(thought.createdAt || new Date()).toLocaleDateString()}
                                </span>
                            </div>
                        </button>
                    ))}

                    {thoughts.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>No thoughts yet</p>
                            <p className="text-sm mt-2">Start by analyzing a decision!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Selected Thought */}
            <div className="flex-1 overflow-y-auto p-8">
                {selectedThought ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{selectedThought.title}</h1>
                            <p className="text-gray-600 mt-2">
                                {new Date(selectedThought.createdAt || new Date()).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>

                        {selectedThought.verdict && (
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-4 py-2 rounded-full font-medium ${getVerdictColor(selectedThought.verdict)}`}>
                                        {selectedThought.verdict.toUpperCase()}
                                    </span>
                                    {selectedThought.confidence && (
                                        <span className="text-gray-600">
                                            Confidence: {selectedThought.confidence}%
                                        </span>
                                    )}
                                </div>

                                {selectedThought.reasoning && (
                                    <div className="mt-4">
                                        <h3 className="font-medium text-gray-900 mb-2">Reasoning</h3>
                                        <p className="text-gray-700">{selectedThought.reasoning}</p>
                                    </div>
                                )}

                                {selectedThought.timeline && (
                                    <div className="mt-4">
                                        <span className="text-sm text-gray-600">Timeline: </span>
                                        <span className="font-medium">{selectedThought.timeline}</span>
                                    </div>
                                )}
                            </Card>
                        )}

                        <Card className="p-6">
                            <h3 className="font-medium text-gray-900 mb-4">Content</h3>
                            <div className="prose prose-gray max-w-none">
                                <p className="whitespace-pre-wrap text-gray-700">{selectedThought.content}</p>
                            </div>
                        </Card>

                        {selectedThought.actionItems && (selectedThought.actionItems as any[]).length > 0 && (
                            <Card className="p-6">
                                <h3 className="font-medium text-gray-900 mb-4">Action Items</h3>
                                <ul className="space-y-2">
                                    {(selectedThought.actionItems as any[]).map((item, index) => (
                                        <li key={index} className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={item.completed}
                                                readOnly
                                                className="h-5 w-5 text-blue-600 rounded mt-0.5 mr-3"
                                            />
                                            <span className="text-gray-700">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <p className="text-xl">Select a thought to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
