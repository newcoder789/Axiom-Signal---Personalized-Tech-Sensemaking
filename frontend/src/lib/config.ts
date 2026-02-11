/**
 * Central configuration for Axiom Signal Frontend
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// WebSocket URL derived from API URL
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const CONFIG = {
    API_BASE_URL,
    WS_BASE_URL,
    ENDPOINTS: {
        TASKS: `${API_BASE_URL}/api/agent/task`,
        VERDICT: `${API_BASE_URL}/api/verdict`,
        NOTIFICATIONS: `${WS_BASE_URL}/ws/notifications`,
    }
};
