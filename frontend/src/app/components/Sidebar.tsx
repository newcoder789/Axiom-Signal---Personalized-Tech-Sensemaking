"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
    { name: "Dashboard", href: "/", icon: "◼" },
    { name: "Think / Explore", href: "/explore", icon: "◎" },
    { name: "Decide", href: "/decide", icon: "◇" },
    { name: "Journal", href: "/journal", icon: "▤" },
    { name: "Focus", href: "/focus", icon: "●" },
    { name: "History", href: "/history", icon: "◫" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <Link href="/" className="sidebar-logo">
                    <div className="sidebar-logo-icon">A</div>
                    <div className="sidebar-logo-text">
                        <h1>Axiom</h1>
                        <p>thinking os</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? "active" : ""}`}
                        style={{ position: "relative" }}
                    >
                        <span style={{ opacity: 0.6, fontSize: "10px" }}>{item.icon}</span>
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="status-card">
                    <div className="flex items-center gap-2">
                        <div className="status-indicator status-indicator-pulse"></div>
                        <div>
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
                                System Active
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                Memory: 847 entries
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
