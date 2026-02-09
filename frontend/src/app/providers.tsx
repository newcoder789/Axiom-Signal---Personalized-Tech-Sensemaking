'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from './components/ErrorBoundary';

export function ClientProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </SessionProvider>
    );
}
