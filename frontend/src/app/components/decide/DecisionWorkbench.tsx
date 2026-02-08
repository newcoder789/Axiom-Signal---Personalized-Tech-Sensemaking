'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Card } from '../ui/Card';

interface DecisionWorkbenchProps {
    onAnalyze: (data: {
        topic: string;
        content: string;
        context: any;
    }) => Promise<void>;
    loading: boolean;
}

export default function DecisionWorkbench({ onAnalyze, loading }: DecisionWorkbenchProps) {
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [context, setContext] = useState({
        riskTolerance: 'medium' as 'low' | 'medium' | 'high',
        timeHorizon: '3 months',
        experienceLevel: 'intermediate',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !content.trim()) return;

        await onAnalyze({
            topic: topic.trim(),
            content: content.trim(),
            context,
        });
    };

    return (
        <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <Input
                        label="Decision Topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Should I learn Rust for systems programming?"
                        required
                    />
                </div>

                <div>
                    <Textarea
                        label="Context & Details"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Describe the decision, why it matters, what you know..."
                        rows={6}
                        required
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Risk Tolerance
                        </label>
                        <select
                            value={context.riskTolerance}
                            onChange={(e) => setContext({ ...context, riskTolerance: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Horizon
                        </label>
                        <select
                            value={context.timeHorizon}
                            onChange={(e) => setContext({ ...context, timeHorizon: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="now">Now</option>
                            <option value="3 months">3 months</option>
                            <option value="6+ months">6+ months</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Experience Level
                        </label>
                        <select
                            value={context.experienceLevel}
                            onChange={(e) => setContext({ ...context, experienceLevel: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={loading || !topic.trim() || !content.trim()}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Decision'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
