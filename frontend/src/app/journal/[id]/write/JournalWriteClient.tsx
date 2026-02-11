'use client';

import { useState, useEffect, useCallback } from 'react';
import { JournalEditor } from '@/app/components/journal/JournalEditor';
import { AssistantPanel } from '@/app/components/journal/AssistantPanel';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Journal, Thought } from '@/lib/schema';
import { createThought, getThoughtsByJournal } from '@/lib/actions';
import { successToast, errorToast } from '@/lib/toast';

interface Props {
    journal: Journal;
    initialThoughts: Thought[];
}

export default function JournalWriteClient({ journal, initialThoughts }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts);

    // Initialize selectedThought based on URL param if present
    const [selectedThought, setSelectedThought] = useState<Thought | null>(() => {
        const thoughtId = searchParams.get('thought');
        if (thoughtId) {
            return initialThoughts.find(t => t.id === thoughtId) || null;
        }
        return null;
    });

    // Sync selectedThought with URL param
    useEffect(() => {
        const thoughtId = searchParams.get('thought');
        if (thoughtId) {
            const thought = thoughts.find(t => t.id === thoughtId);
            if (thought) setSelectedThought(thought);
        }
    }, [searchParams, thoughts]);

    const [verdictData, setVerdictData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterVerdict, setFilterVerdict] = useState<string>('all');
    const [isLoadingThoughts, setIsLoadingThoughts] = useState(false);
    const [liveContent, setLiveContent] = useState({ title: '', body: '' });
    const [isFocusExpanded, setIsFocusExpanded] = useState(false);

    // Reload thoughts when needed
    const reloadThoughts = async (silent = false) => {
        if (!silent) setIsLoadingThoughts(true);
        try {
            const updatedThoughts = await getThoughtsByJournal(journal.id);
            setThoughts(updatedThoughts);
        } catch (error) {
            console.error('Failed to reload thoughts:', error);
        } finally {
            if (!silent) setIsLoadingThoughts(false);
        }
    };

    const handleSelectThought = (thought: Thought | null) => {
        setSelectedThought(thought);

        // Update URL query param silently
        const params = new URLSearchParams(searchParams.toString());
        if (thought?.id) {
            params.set('thought', thought.id);
        } else {
            params.delete('thought');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };

    const filteredThoughts = thoughts.filter(thought => {
        const matchesSearch = thought.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterVerdict === 'all' || thought.verdict === filterVerdict;
        return matchesSearch && matchesFilter;
    });

    const getVerdictColor = (verdict?: string) => {
        const colors: Record<string, string> = {
            pursue: '#60a5fa',
            explore: '#fbbf24',
            watchlist: '#a1a6b3',
            ignore: '#666',
        };
        return colors[verdict || ''] || '#666';
    };

    const handleAnalyze = async (content: { title: string; body: string }) => {
        if (!content.body.trim()) return;

        try {
            const response = await fetch('/api/verdict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: content.title || 'Untitled',
                    user_profile: 'Developer',
                    experience_level: '2 years',
                    risk_tolerance: 'medium',
                    additional_notes: content.body
                })
            });

            if (response.ok) {
                const data = await response.json();
                setVerdictData(data);
            }
        } catch (error) {
            console.error('Analysis failed:', error);
        }
    };

    const handleSave = async (content: { title: string; body: string }) => {
        if (!content.title.trim()) {
            errorToast('Please enter a title');
            return;
        }

        try {
            // If we're editing an existing thought, update it
            if (selectedThought && selectedThought.id) {
                // Update existing thought
                const response = await fetch(`/api/thoughts/${selectedThought.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: content.title,
                        content: content.body,
                        verdict: verdictData?.verdict || selectedThought.verdict,
                        confidence: verdictData?.confidence || selectedThought.confidence,
                        reasoning: verdictData?.reasoning || selectedThought.reasoning,
                        actionItems: verdictData?.actionItems || selectedThought.actionItems,
                        reasonCodes: verdictData?.reasonCodes || selectedThought.reasonCodes,
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update thought');
                }

                const updatedThought = await response.json();
                await reloadThoughts(true); // Silent reload
                setSelectedThought(updatedThought); // Update state only, don't touch URL
                setVerdictData(null);
                // successToast('Entry updated!'); // Removed for less noise during auto-save
            } else {
                // Create new thought
                const newThought = await createThought({
                    journalId: journal.id,
                    title: content.title,
                    content: content.body,
                    verdict: verdictData?.verdict || null,
                    confidence: verdictData?.confidence || null,
                    reasoning: verdictData?.reasoning || null,
                    actionItems: verdictData?.actionItems || null,
                    reasonCodes: verdictData?.reasonCodes || null,
                });

                // Reload thoughts and select the new one
                await reloadThoughts(true); // Silent reload
                handleSelectThought(newThought);
                setVerdictData(null);
                successToast('Entry saved!');
            }
        } catch (error) {
            console.error('Save failed:', error);
            errorToast('Failed to save entry');
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f1115' }}>
            {/* Left Sidebar - Entry List */}
            <div style={{
                width: '260px',
                borderRight: '1px solid #222632',
                background: '#151821',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #222632'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e6e8eb' }}>
                            {journal.icon} {journal.title}
                        </h2>
                        <button
                            onClick={() => router.push(`/journal/${journal.id}`)}
                            style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                border: '1px solid #222632',
                                borderRadius: '6px',
                                color: '#a1a6b3',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            ← Back
                        </button>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search entries..."
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#0f1115',
                            border: '1px solid #222632',
                            borderRadius: '6px',
                            color: '#e6e8eb',
                            fontSize: '13px',
                            marginBottom: '12px',
                            outline: 'none'
                        }}
                    />

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['all', 'pursue', 'explore', 'watchlist', 'ignore'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setFilterVerdict(filter)}
                                style={{
                                    padding: '4px 10px',
                                    background: filterVerdict === filter ? '#222632' : 'transparent',
                                    border: '1px solid #222632',
                                    borderRadius: '12px',
                                    color: filterVerdict === filter ? '#e6e8eb' : '#a1a6b3',
                                    fontSize: '11px',
                                    textTransform: 'capitalize',
                                    cursor: 'pointer'
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Entry List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {isLoadingThoughts ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#a1a6b3', fontSize: '13px' }}>
                            Loading...
                        </div>
                    ) : filteredThoughts.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#a1a6b3', fontSize: '13px' }}>
                            No entries found
                        </div>
                    ) : (
                        <>
                            {/* Regular Thoughts */}
                            {filteredThoughts.filter(t => !t.title.startsWith('Focus Session:')).map((thought) => (
                                <div
                                    key={thought.id}
                                    onClick={() => handleSelectThought(thought)}
                                    style={{
                                        padding: '12px',
                                        marginBottom: '8px',
                                        background: selectedThought?.id === thought.id ? '#0f1115' : 'transparent',
                                        border: `1px solid ${selectedThought?.id === thought.id ? '#d6a14b' : '#222632'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <h3 style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#e6e8eb',
                                        marginBottom: '6px'
                                    }}>
                                        {thought.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '12px',
                                        color: '#a1a6b3',
                                        marginBottom: '8px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {thought.content?.substring(0, 60) || 'No content'}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {thought.verdict && (
                                            <span style={{
                                                padding: '2px 8px',
                                                background: getVerdictColor(thought.verdict) + '30',
                                                color: getVerdictColor(thought.verdict),
                                                borderRadius: '10px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                textTransform: 'uppercase'
                                            }}>
                                                {thought.verdict}
                                            </span>
                                        )}
                                        {thought.confidence && thought.verdict && (
                                            <div style={{
                                                flex: 1,
                                                marginLeft: '8px',
                                                height: '2px',
                                                background: '#222632',
                                                borderRadius: '2px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${thought.confidence}%`,
                                                    height: '100%',
                                                    background: getVerdictColor(thought.verdict)
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Focus Sessions Group */}
                            {filteredThoughts.filter(t => t.title.startsWith('Focus Session:')).length > 0 && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid #222632', paddingTop: '12px' }}>
                                    <div
                                        onClick={() => setIsFocusExpanded(!isFocusExpanded)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            color: '#a1a6b3',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            marginBottom: '8px',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '10px' }}>{isFocusExpanded ? '▼' : '▶'}</span>
                                        <span>Focus Sessions ({filteredThoughts.filter(t => t.title.startsWith('Focus Session:')).length})</span>
                                    </div>

                                    {isFocusExpanded && filteredThoughts.filter(t => t.title.startsWith('Focus Session:')).map((thought) => (
                                        <div
                                            key={thought.id}
                                            onClick={() => handleSelectThought(thought)}
                                            style={{
                                                padding: '10px',
                                                marginBottom: '6px',
                                                marginLeft: '8px',
                                                background: selectedThought?.id === thought.id ? '#0f1115' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${selectedThought?.id === thought.id ? '#d6a14b' : 'transparent'}`,
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                opacity: 0.8
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '10px' }}>●</span>
                                                <h3 style={{
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    color: '#e6e8eb',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {thought.title.replace('Focus Session: ', '')}
                                                </h3>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{
                    padding: '16px',
                    borderTop: '1px solid #222632'
                }}>
                    <button
                        onClick={() => handleSelectThought(null)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#d6a14b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        + New Entry
                    </button>
                </div>
            </div>

            {/* Main Editor */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <JournalEditor
                    thought={selectedThought}
                    onAnalyze={handleAnalyze}
                    onSave={handleSave}
                    onChange={useCallback((content: any) => setLiveContent(content), [])}
                />
            </div>

            {/* Right Assistant Panel */}
            <AssistantPanel
                verdictData={verdictData}
                liveContent={liveContent}
                journalId={journal.id}
            />
        </div>
    );
}
