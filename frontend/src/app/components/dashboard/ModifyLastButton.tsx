'use client';

import { useNotifications } from "@/app/notifications/NotificationContext";
import { useState } from "react";

export function ModifyLastButton() {
    const { handleAction } = useNotifications();
    const [isFetching, setIsFetching] = useState(false);

    const handleEditLast = async () => {
        setIsFetching(true);
        try {
            const res = await fetch('http://localhost:8000/api/thoughts/latest?user_id=default');
            if (res.ok) {
                const data = await res.json();
                // We reuse the notification action mechanism to open the modal
                handleAction({ id: 'dashboard_edit' } as any, 'open_journal', { memory_id: data.id });
            } else {
                alert("No recent thoughts found to edit.");
            }
        } catch (e) {
            console.error("Failed to fetch latest thought:", e);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <button
            onClick={handleEditLast}
            disabled={isFetching}
            className="btn btn-secondary"
            style={{
                width: "100%",
                justifyContent: "flex-start",
                marginTop: "8px",
                borderColor: "var(--accent-gold-muted)",
                color: "var(--accent-gold)"
            }}
        >
            {isFetching ? "⏳ Fetching..." : "✏️ Modify Last Entry"}
        </button>
    );
}
