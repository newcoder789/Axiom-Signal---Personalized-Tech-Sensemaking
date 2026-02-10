"use client";

import React, { useState } from 'react';
import taskService from '@/lib/tasks/TaskService';
import { TaskItem } from '@/lib/tasks/TaskConfig';

interface TaskButtonProps {
    task: TaskItem;
    onSuccess?: (result: any) => void;
    onError?: (error: any) => void;
}

export const TaskButton: React.FC<TaskButtonProps> = ({ task, onSuccess, onError }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleExecute = async () => {
        setIsLoading(true);
        try {
            const result = await taskService.executeTask(task.id);
            if (onSuccess) onSuccess(result);
        } catch (error: any) {
            if (onError) onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleExecute}
            disabled={isLoading}
            className={`btn ${isLoading ? 'btn-ghost' : 'btn-secondary'}`}
            style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: "10px",
                padding: "12px",
                fontSize: "14px",
                position: "relative",
                overflow: "hidden"
            }}
            title={task.description}
        >
            <span>{task.icon}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{task.buttonText}</span>
            {isLoading && (
                <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: "2px",
                    background: "var(--accent-gold)",
                    width: "100%",
                    animation: "loading-bar 1.5s infinite ease-in-out"
                }}></div>
            )}
        </button>
    );
};
