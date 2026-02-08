'use client';

import { useState } from 'react';
import { createJournal } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface CreateJournalDialogProps {
    onClose: () => void;
}

const ICON_OPTIONS = ['📔', '💡', '🚀', '🎯', '⚡', '🔥', '💻', '🧠'];
const COLOR_OPTIONS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
];

export function CreateJournalDialog({ onClose }: CreateJournalDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
    const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsCreating(true);
        try {
            const journal = await createJournal({
                title: title.trim(),
                description: description.trim() || undefined,
                icon: selectedIcon,
                color: selectedColor,
            });

            router.refresh();
            onClose();
        } catch (error) {
            console.error('Failed to create journal:', error);
            alert('Failed to create journal. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl p-6"
                style={{ background: 'var(--bg-elevated)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '24px'
                }}>
                    Create New Journal
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--text-primary)'
                        }}>
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Backend Learning Path"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--text-primary)'
                        }}>
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this journal for?"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                outline: 'none',
                                resize: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                            maxLength={500}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--text-primary)'
                        }}>
                            Icon
                        </label>
                        <div className="flex gap-2">
                            {ICON_OPTIONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className="w-12 h-12 rounded-lg text-2xl transition-all"
                                    style={{
                                        background: selectedIcon === icon ? 'var(--accent-blue)' : 'var(--bg-primary)',
                                        border: `2px solid ${selectedIcon === icon ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                                    }}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--text-primary)'
                        }}>
                            Color
                        </label>
                        <div className="flex gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className="w-10 h-10 rounded-lg transition-all"
                                    style={{
                                        background: color,
                                        border: `3px solid ${selectedColor === color ? 'white' : 'transparent'}`,
                                        boxShadow: selectedColor === color ? '0 0 0 2px var(--accent-blue)' : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', paddingTop: '24px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                background: 'transparent',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isCreating}
                            style={{
                                flex: 1,
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                background: 'var(--accent-blue)',
                                color: 'white',
                                border: 'none',
                                cursor: !title.trim() || isCreating ? 'not-allowed' : 'pointer',
                                opacity: !title.trim() || isCreating ? 0.5 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {isCreating ? 'Creating...' : 'Create Journal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
