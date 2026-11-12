
"use client";

import { useState, type ReactNode } from "react";

export type AdminModule =
  | "overview"
  | "students"
  | "companies"
  | "internships"
  | "applications"
  | "analytics";

export type AdminNavItem = {
  id: AdminModule;
  label: string;
  icon: string;
  count?: number;
};

type AdminShellProps = {
  active: AdminModule;
  onNavigate: (module: AdminModule) => void;
  adminEmail: string;
  nav: AdminNavItem[];
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSignOut: () => void;
  loading: boolean;
  children: ReactNode;
};

function ShellIcon({
  name,
  size = 19,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M5 21V5l7-2v18M19 21V9l-7-2" />
        <path d="M8 7h1M8 11h1M8 15h1M15 11h1M15 15h1" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-5 5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] ?? paths.shield}</svg>;
}

export default function AdminShell({
  active,
  onNavigate,
  adminEmail,
  nav,
  title,
  search,
  onSearchChange,
  onRefresh,
  onSignOut,
  loading,
  children,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function navigate(module: AdminModule) {
    onNavigate(module);
    setMobileOpen(false);
  }

  return (
    <div className="ih-admin min-h-screen">
      {/* Top navigation */}
      <header className="ih-admin-topbar">
        <div className="ih-admin-topbar-left">
          <button
            type="button"
            className="ih-admin-icon-button ih-admin-mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            <ShellIcon name={mobileOpen ? "close" : "menu"} />
          </button>

          <div className="ih-admin-brand">
            {/* Same infinity logo styling as StudentNavbar */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-2xl font-semibold text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              ∞
            </div>

            <div>
              <div className="ih-admin-brand-name">
                Intern<span>Hub</span>
              </div>
              <div className="ih-admin-brand-caption">
                SUPER ADMIN CONSOLE
              </div>
            </div>
          </div>
        </div>

        <div className="ih-admin-topbar-right">
          <div className="ih-admin-search">
            <ShellIcon name="search" size={17} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search records..."
              aria-label="Search dashboard records"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <ShellIcon name="close" size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="ih-admin-refresh"
            onClick={onRefresh}
            disabled={loading}
          >
            <span className={loading ? "ih-admin-spinning" : ""}>
              <ShellIcon name="refresh" size={17} />
            </span>
            <span className="ih-admin-refresh-label">
              {loading ? "Refreshing" : "Refresh"}
            </span>
          </button>

          <div className="ih-admin-profile-wrap">
            <button
              type="button"
              className="ih-admin-profile"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
            >
              <div className="ih-admin-avatar">SA</div>
              <div className="ih-admin-profile-details">
                <strong>Super Admin</strong>
                <span>{adminEmail}</span>
              </div>
              <ShellIcon name="chevron" size={15} />
            </button>

            {profileOpen && (
              <div className="ih-admin-profile-menu">
                <div className="ih-admin-profile-menu-info">
                  <strong>Signed in as</strong>
                  <span>{adminEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onSignOut();
                  }}
                >
                  <ShellIcon name="logout" size={17} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="ih-admin-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="ih-admin-layout">
        {/* Sidebar */}
        <aside
          className={`ih-admin-sidebar ${
            mobileOpen ? "ih-admin-sidebar-open" : ""
          }`}
        >
          <div className="ih-admin-sidebar-heading">WORKSPACE</div>

          <nav className="ih-admin-nav">
            {nav.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`ih-admin-nav-item ${
                  active === item.id ? "active" : ""
                }`}
              >
                <span className="ih-admin-nav-icon">
                  <ShellIcon name={item.icon} />
                </span>
                <span className="ih-admin-nav-label">{item.label}</span>
                {item.count !== undefined && (
                  <span className="ih-admin-nav-count">
                    {item.count.toLocaleString("en-IN")}
                  </span>
                )}
                {active === item.id && (
                  <span className="ih-admin-nav-indicator" />
                )}
              </button>
            ))}
          </nav>

          <div className="ih-admin-sidebar-bottom">
            <div className="ih-admin-security-card">
              <div className="ih-admin-security-icon">
                <ShellIcon name="shield" size={17} />
              </div>
              <div>
                <strong>Protected workspace</strong>
                <p>Restricted to authorised Super Admin accounts.</p>
              </div>
            </div>
            <div className="ih-admin-database-label">
              <span />
              Connected workspace · tracker_db
            </div>
          </div>
        </aside>

        {/* Main area */}
        <main className="ih-admin-main">
          <div className="ih-admin-page-heading">
            <div>
              <div className="ih-admin-breadcrumb">
                PLATFORM CONTROL <span>/</span> {active.toUpperCase()}
              </div>
              <h1>{title}</h1>
              <p>
                Monitor and manage your InternHub platform from one place.
              </p>
            </div>
          </div>

          <div className="ih-admin-content">{children}</div>

          <footer className="ih-admin-footer">
            InternHub · Super Admin Console · Live database view
          </footer>
        </main>
      </div>
    </div>
  );
}
