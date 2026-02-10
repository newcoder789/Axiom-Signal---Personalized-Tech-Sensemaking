
'use client';

import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationManager() {
    // Initialize the global notification listener
    useNotifications();

    // This component doesn't render anything itself, 
    // it just manages the WebSocket side-effect and shows toasts
    return null;
}
