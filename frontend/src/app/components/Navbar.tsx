"use client";

import { usePathname } from "next/navigation";

const pageInfo: Record<string, { title: string; description: string }> = {
    "/": { title: "Dashboard", description: "Overview" },
    "/explore": { title: "Explore", description: "Investigate ideas" },
    "/decide": { title: "Decide", description: "Get verdicts" },
    "/journal": { title: "Journal", description: "Thinking log" },
    "/focus": { title: "Focus", description: "Execution mode" },
    "/history": { title: "History", description: "Decision evolution" },
};

export default function Navbar() {
    const pathname = usePathname();
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

                {/* User */}
                <button className="navbar-user">
                    <div className="navbar-user-avatar">A</div>
                </button>
            </div>
        </nav>
    );
}
