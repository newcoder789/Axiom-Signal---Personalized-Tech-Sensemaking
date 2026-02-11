"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL } from '@/lib/config';

// Types
export interface NotificationButton {
    text: string;
    action: string;
    data?: any;
}

export interface Notification {
    id: string;
    user_id: string;
    text: string;
    type: 'repetition' | 'contradiction' | 'followup_needed' | 'general';
    urgency: 'high' | 'medium' | 'low';
    buttons?: NotificationButton[];
    created_at: string;
    interaction_id?: number;
    related_memory_ids?: number[];
}

interface NotificationContextType {
    notifications: Notification[];
    dismissNotification: (id: string) => void;
    handleAction: (notification: Notification, action: string, data?: any) => void;
    isConnected: boolean;
    editingMemoryId: number | null;
    closeEditModal: () => void;
    agentLogs: string[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
    const [agentLogs, setAgentLogs] = useState<string[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = () => {
        // In production, get real user ID
        const userId = "default";
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${WS_BASE_URL}/ws/notifications?user_id=${userId}`;

        console.log("🔌 Connecting to Notification WS:", wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ WS Connected');
            setIsConnected(true);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 WS Message:", data);

                if (data.type === 'advice' && data.data) {
                    addNotification(data.data);
                } else if (data.event === 'notification' && data.data) {
                    const oldData = data.data;
                    addNotification({
                        id: Date.now().toString(),
                        user_id: userId,
                        text: oldData.content,
                        type: 'general',
                        urgency: 'medium',
                        created_at: new Date().toISOString()
                    });
                } else if (data.event === 'AGENT_STATUS' && data.data) {
                    setAgentLogs(prev => [data.data.message, ...prev].slice(0, 5));
                }
            } catch (e) {
                console.error("WS Parse Error:", e);
            }
        };

        ws.onclose = () => {
            console.log('❌ WS Disconnected');
            setIsConnected(false);
            wsRef.current = null;
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error("WS Error:", err);
            ws.close();
        };

        wsRef.current = ws;
    };

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    const addNotification = (n: Notification) => {
        setNotifications(prev => {
            if (prev.some(existing => existing.id === n.id)) return prev;
            return [n, ...prev];
        });
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const closeEditModal = () => setEditingMemoryId(null);

    const handleAction = async (notification: Notification, action: string, data?: any) => {
        console.log(`🚀 Action triggered: ${action}`, data);

        const user_response = action === 'dismiss' ? 'dismissed' : 'acted';

        // Optimistic remove for most actions
        dismissNotification(notification.id);

        if (action === 'open_journal' && data?.memory_id) {
            setEditingMemoryId(data.memory_id);
        }

        // Call backend feedback API
        if (notification.interaction_id) {
            try {
                await fetch(`${API_BASE_URL}/api/agent/interaction/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        interaction_id: notification.interaction_id,
                        user_response: user_response,
                        user_id: notification.user_id,
                        related_memory_ids: notification.related_memory_ids || []
                    })
                });
                console.log("✅ Feedback recorded in backend");
            } catch (e) {
                console.error("❌ Failed to record feedback:", e);
            }
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            dismissNotification,
            handleAction,
            isConnected,
            editingMemoryId,
            closeEditModal,
            agentLogs
        }}>
            {children}
            {editingMemoryId && (
                <QuickEditModal
                    id={editingMemoryId}
                    onClose={closeEditModal}
                />
            )}
        </NotificationContext.Provider>
    );
};

// Internal component for the modal
const QuickEditModal: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchThought = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/thoughts/${id}`);
                const data = await res.json();
                setContent(data.content);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchThought();
    }, [id]);

    const handleSave = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/thoughts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#151821',
                padding: '32px',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                border: '1px solid #222632'
            }}>
                <h2 style={{ marginBottom: '16px', color: '#e6e8eb' }}>Refine Note</h2>
                {isLoading ? (
                    <div style={{ color: '#a1a6b3' }}>Loading...</div>
                ) : (
                    <>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            style={{
                                width: '100%',
                                height: '200px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                padding: '16px',
                                color: '#e6e8eb',
                                marginBottom: '20px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={onClose} style={{ color: '#a1a6b3', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={handleSave}
                                style={{
                                    background: '#d6a14b',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 24px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
