"use client";

import React from 'react';
import { useNotifications, Notification } from './NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter: React.FC = () => {
    const { notifications, dismissNotification, handleAction } = useNotifications();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            <AnimatePresence>
                {notifications.map((n) => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        layout
                        className={`
                            relative overflow-hidden rounded-lg shadow-lg border-l-4 p-4 bg-white dark:bg-gray-800
                            ${n.urgency === 'high' ? 'border-red-500' :
                                n.urgency === 'medium' ? 'border-yellow-500' : 'border-blue-500'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">
                                    {n.type === 'repetition' && '🔄'}
                                    {n.type === 'contradiction' && '⚡'}
                                    {n.type === 'followup_needed' && '⏰'}
                                    {n.type === 'general' && '📢'}
                                </span>
                                <span className={`text-sm font-semibold uppercase ${n.urgency === 'high' ? 'text-red-500' :
                                    n.urgency === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                                    }`}>
                                    {n.type.replace('_', ' ')}
                                </span>
                            </div>
                            <button
                                onClick={() => dismissNotification(n.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                            {n.text}
                        </p>

                        {n.buttons && n.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {n.buttons.map((btn, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAction(n, btn.action, btn.data)}
                                        className={`
                                            px-3 py-1 rounded text-xs font-medium transition-colors
                                            ${btn.action === 'dismiss'
                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'}
                                        `}
                                    >
                                        {btn.text}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Progress bar for auto-dismiss (mock) */}
                        {n.urgency === 'low' && (
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 10 }}
                                className="absolute bottom-0 left-0 h-1 bg-blue-500/20"
                            />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
