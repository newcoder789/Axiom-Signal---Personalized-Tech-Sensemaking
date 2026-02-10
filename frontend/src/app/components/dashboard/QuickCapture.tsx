'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function QuickCapture() {
    const [input, setInput] = useState('');
    const router = useRouter();

    const handleAnalyze = () => {
        if (!input.trim()) return;
        // Encode and redirect to decide page
        router.push(`/decide?topic=${encodeURIComponent(input)}`);
    };

    const handleJournal = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch('http://localhost:8000/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: input,
                    user_id: 'default'
                })
            });
            const result = await response.json();
            if (result.success) {
                setInput('');
                // Note: The websocket will trigger the "Edit" notification automatically
                console.log("✅ Journal entry created:", result.memory_id);
            }
        } catch (error) {
            console.error("❌ Failed to create journal entry:", error);
        }
    };

    return (
        <div className="card card-premium mb-6" style={{ padding: "24px" }}>
            <div className="label mb-3" style={{ color: "var(--accent-gold)" }}>⚡ Quick Capture</div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What decision or idea are you wrestling with?"
                    className="input glass"
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: '15px'
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAnalyze();
                    }}
                />
                <button
                    onClick={handleAnalyze}
                    disabled={!input.trim()}
                    className="btn btn-primary"
                    style={{
                        background: "var(--accent-gold)",
                        color: "#000",
                        fontWeight: 600,
                        opacity: !input.trim() ? 0.5 : 1
                    }}
                >
                    Analyze
                </button>
                <button
                    onClick={handleJournal}
                    disabled={!input.trim()}
                    className="btn btn-secondary"
                    style={{ opacity: !input.trim() ? 0.5 : 1 }}
                >
                    Journal
                </button>
            </div>
        </div>
    );
}
