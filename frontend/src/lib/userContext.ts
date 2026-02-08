// Simple user context for Axiom
// Stored in localStorage to create stable user identity across sessions

export interface UserContext {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    createdAt: string;
}

export function getUserContext(): UserContext {
    if (typeof window === 'undefined') {
        return {
            id: crypto.randomUUID(),
            name: 'Developer',
            role: 'developer',
            createdAt: new Date().toISOString(),
        };
    }

    let context = localStorage.getItem('axiom_user_context');

    if (!context) {
        // Create new user context
        const newContext: UserContext = {
            id: crypto.randomUUID(),
            name: 'Developer',
            role: 'developer',
            createdAt: new Date().toISOString(),
        };

        localStorage.setItem('axiom_user_context', JSON.stringify(newContext));
        return newContext;
    }

    return JSON.parse(context);
}

export function updateUserContext(updates: Partial<UserContext>) {
    const current = getUserContext();
    const updated = { ...current, ...updates };
    localStorage.setItem('axiom_user_context', JSON.stringify(updated));
    return updated;
}

export function getUserProfileString(): string {
    const context = getUserContext();
    // Create stable profile string for backend hashing
    return `${context.name || 'Developer'} (${context.role || 'developer'}) - ID: ${context.id}`;
}
