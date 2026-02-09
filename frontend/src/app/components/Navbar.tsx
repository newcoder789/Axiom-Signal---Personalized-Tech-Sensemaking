"use client";

import { usePathname } from "next/navigation";

const pageInfo: Record<string, { title: string; description: string }> = {
    "/": { title: "Dashboard", description: "Overview" },
    "/explore": { title: "Think / Explore", description: "Capture and explore thoughts" },
    "/decide": { title: "Decide", description: "Get verdicts" },
    "/journal": { title: "Journal", description: "Thinking log" },
    "/focus": { title: "Focus", description: "Execution mode" },
    "/history": { title: "History", description: "Decision evolution" },
};

import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const current = pageInfo[pathname] || { title: "Axiom", description: "" };

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <h1 className="navbar-title">{current.title}</h1>
                <span className="navbar-description">{current.description}</span>
            </div>

            <div className="navbar-right">
                {/* Search */}
                <div className="navbar-search">
                    <svg className="navbar-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="navbar-search-input"
                    />
                    <span className="navbar-search-shortcut">⌘K</span>
                </div>

                {/* Notifications */}
                <button className="navbar-icon-btn">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="navbar-notification-dot"></span>
                </button>

                {/* User Auth */}
                {status === 'loading' ? (
                    <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                ) : session ? (
                    <button onClick={() => signOut()} className="navbar-user relative group">
                        {session.user?.image ? (
                            <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
                        ) : (
                            <div className="navbar-user-avatar">{session.user?.name?.[0] || 'U'}</div>
                        )}
                        <span className="absolute right-0 top-full mt-2 w-32 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            Sign Out
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={() => signIn()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </nav>
    );
}
