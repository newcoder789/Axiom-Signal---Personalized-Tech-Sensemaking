'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { successToast, errorToast } from '@/lib/toast';

interface SaveDecisionDialogProps {
    verdict: any;
    topic: string;
    onClose: () => void;
    onSave?: () => void;
}

export function SaveDecisionDialog({ verdict, topic, onClose, onSave }: SaveDecisionDialogProps) {
    const router = useRouter();
    const [selectedJournalId, setSelectedJournalId] = useState('');
    const [newJournalTitle, setNewJournalTitle] = useState('');
    const [createNew, setCreateNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [journals, setJournals] = useState<any[]>([]);
    const [isLoadingJournals, setIsLoadingJournals] = useState(false);

    // Load journals when component mounts
    useEffect(() => {
        const loadJournals = async () => {
            setIsLoadingJournals(true);
            try {
                const response = await fetch('/api/journal');
                if (response.ok) {
                    const data = await response.json();
                    setJournals(data.journals || []);
                }
            } catch (error) {
                console.error('Failed to load journals:', error);
            } finally {
                setIsLoadingJournals(false);
            }
        };
        loadJournals();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let journalId = selectedJournalId;

            // Create new journal if needed
            if (createNew && newJournalTitle.trim()) {
                const createResponse = await fetch('/api/journal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: newJournalTitle.trim(),
                        icon: '💡',
                        color: '#3B82F6'
                    })
                });

                if (createResponse.ok) {
                    const { journal } = await createResponse.json();
                    journalId = journal.id;
                }
            }

            if (!journalId) {
                errorToast('Please select or create a journal');
                setIsSaving(false);
                return;
            }

            // Save decision to journal
            const saveResponse = await fetch('/api/decide/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journalId,
                    title: topic,
                    content: `Verdict: ${verdict.verdict}\nConfidence: ${verdict.confidence}%\n\nReasoning:\n${verdict.reasoning}`,
                    verdict: verdict.verdict,
                    confidence: verdict.confidence,
                    reasoning: verdict.reasoning,
                    actionItems: verdict.actionItems || [],
                    reasonCodes: verdict.reasonCodes || [],
                    toolEvidence: verdict.tool_evidence,
                    sources: verdict.sources || []
                })
            });

            if (saveResponse.ok) {
                if (onSave) onSave();
                router.push(`/journal/${journalId}`);
                onClose();
            } else {
                errorToast('Failed to save decision');
            }
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save decision');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: '#151821',
                    borderRadius: '16px',
                    padding: '32px',
                    border: '1px solid #222632',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#e6e8eb',
                    marginBottom: '8px'
                }}>
                    Save Decision
                </h2>
                <p style={{
                    fontSize: '14px',
                    color: '#a1a6b3',
                    marginBottom: '24px'
                }}>
                    Save "{topic}" to a journal for future reference
                </p>

                {/* Create New or Select Existing */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <button
                            onClick={() => setCreateNew(false)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: !createNew ? '#222632' : 'transparent',
                                border: `1px solid ${!createNew ? '#d6a14b' : '#222632'}`,
                                borderRadius: '8px',
                                color: !createNew ? '#e6e8eb' : '#a1a6b3',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Select Existing
                        </button>
                        <button
                            onClick={() => setCreateNew(true)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: createNew ? '#222632' : 'transparent',
                                border: `1px solid ${createNew ? '#d6a14b' : '#222632'}`,
                                borderRadius: '8px',
                                color: createNew ? '#e6e8eb' : '#a1a6b3',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Create New
                        </button>
                    </div>

                    {createNew ? (
                        <input
                            type="text"
                            value={newJournalTitle}
                            onChange={(e) => setNewJournalTitle(e.target.value)}
                            placeholder="New journal title..."
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                color: '#e6e8eb',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#d6a14b'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#222632'}
                        />
                    ) : (
                        <select
                            value={selectedJournalId}
                            onChange={(e) => setSelectedJournalId(e.target.value)}
                            disabled={isLoadingJournals}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                color: '#e6e8eb',
                                fontSize: '15px'
                            }}
                        >
                            <option value="">
                                {isLoadingJournals ? 'Loading...' : 'Select a journal...'}
                            </option>
                            {journals.map((journal) => (
                                <option key={journal.id} value={journal.id}>
                                    {journal.icon} {journal.title}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 600,
                            background: 'transparent',
                            border: '1px solid #222632',
                            color: '#e6e8eb',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || (!createNew && !selectedJournalId) || (createNew && !newJournalTitle.trim())}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 600,
                            background: '#d6a14b',
                            color: '#000',
                            border: 'none',
                            cursor: isSaving || (!createNew && !selectedJournalId) || (createNew && !newJournalTitle.trim()) ? 'not-allowed' : 'pointer',
                            opacity: isSaving || (!createNew && !selectedJournalId) || (createNew && !newJournalTitle.trim()) ? 0.5 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
