'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface MotionWrapperProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export function MotionWrapper({ children, delay = 0, className = "" }: MotionWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.21, 0.47, 0.32, 0.98]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function PresenceWrapper({ children, className = "" }: MotionWrapperProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
