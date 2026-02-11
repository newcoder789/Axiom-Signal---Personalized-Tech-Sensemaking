
import React, { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { WS_BASE_URL } from '../lib/config';

interface AxiomNotification {
    type: 'surprise' | 'action' | 'insight';
    title: string;
    content: string;
    metadata?: any;
}

export const useNotifications = () => {
    const handleNotification = useCallback((notification: AxiomNotification) => {
        const { type, title, content } = notification;

        // custom toast style based on type
        const toastStyle: React.CSSProperties = {
            background: '#151821',
            color: '#fff',
            border: '1px solid #3b82f6',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
        };

        if (type === 'surprise') {
            toastStyle.border = '1px solid #f59e0b'; // Amber for contradictions
        } else if (type === 'action') {
            toastStyle.border = '1px solid #10b981'; // Green for actions
        }

        toast.custom((t) => (
            <div
                className={`${t.visible ? 'animate-in fade-in zoom-in' : 'animate-out fade-out zoom-out'
                    } max-w-md w-full pointer-events-auto flex ring-1 ring-black ring-opacity-5 transition-all duration-300`}
                style={toastStyle}
            >
                <div className="flex-1 w-0 p-1">
                    <div className="flex items-start">
                        <div className="ml-3 flex-1">
                            <p className="text-xs font-bold text-gray-400 underline decoration-blue-500/50 uppercase tracking-widest flex items-center gap-2 mb-1">
                                {type === 'surprise' ? '⚠️ Contradiction' : '⚡ Proactive Insight'}
                            </p>
                            <p className="text-sm font-semibold text-white">
                                {title}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                                {content}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-gray-800 ml-4 pl-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full h-full flex items-center justify-center text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-tighter"
                    >
                        Got it
                    </button>
                </div>
            </div>
        ), { duration: 8000 });
    }, []);

    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            console.log('Connecting to Axiom Notifications WebSocket...');
            socket = new WebSocket(`${WS_BASE_URL}/ws/notifications`);

            socket.onopen = () => {
                console.log('✅ Axiom Notifications Connected');
            };

            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.event === 'notification') {
                        handleNotification(payload.data);
                    }
                } catch (error) {
                    console.error('Error parsing notification:', error);
                }
            };

            socket.onclose = () => {
                console.log('❌ Axiom Notifications Disconnected. Retrying in 5s...');
                reconnectTimeout = setTimeout(connect, 5000);
            };

            socket.onerror = (error) => {
                console.error('WS Error:', error);
                socket?.close();
            };
        };

        connect();

        return () => {
            if (socket) socket.close();
            clearTimeout(reconnectTimeout);
        };
    }, [handleNotification]);
};
