
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const links = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Internships", href: "/recommendations" },
  { label: "My Applications", href: "/applications" },
];

function InfinityMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-7 w-7"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 17.5c-4.5-4.5-11-1.5-11 5s6.5 9.5 11 5l10-10c4.5-4.5 11-1.5 11 5s-6.5 9.5-11 5l-10-10Z"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StudentNavbar({
  rightContent,
}: {
  rightContent?: ReactNode;
}) {
  // Kept for compatibility with existing pages.
  // The navbar now uses its own consistent profile dropdown everywhere.
  void rightContent;

  const pathname = usePathname();
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load the logged-in student's details.
  useEffect(() => {
    let active = true;

    async function loadStudent() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active && data.success && data.user) {
          setStudent(data.user);
        }
      } catch (error) {
        console.error(
          "Unable to load student navigation profile:",
          error
        );
      }
    }

    loadStudent();

    return () => {
      active = false;
    };
  }, []);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutside);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
    };
  }, []);

  // Close menus when navigating.
  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const studentName =
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    student?.email?.split("@")[0] ||
    "Student";

  const initial = studentName.charAt(0).toUpperCase() || "S";

  async function handleSignOut() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      // Attempt to clear the server-side session.
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Logout API returned an error.");
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setProfileOpen(false);
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-[#070817]/95 shadow-[0_8px_30px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1700px] items-center justify-between gap-4 px-5 lg:px-10">

        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="InternHub home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
            <InfinityMark />
          </span>

          <span className="text-[21px] font-extrabold tracking-tight text-white">
            Intern<span className="text-fuchsia-400">Hub</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden h-[76px] items-center gap-5 xl:flex"
          aria-label="Student navigation"
        >
          {links.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center border-b-2 px-0.5 pt-0.5 text-[13px] font-semibold transition ${
                  active
                    ? "border-fuchsia-500 text-white"
                    : "border-transparent text-slate-400 hover:border-fuchsia-400/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-xl p-2 text-lg text-fuchsia-300 transition hover:bg-white/5"
            title="Notifications"
          >
            ♧
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-[#070817]" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-transparent px-1.5 py-1 transition hover:border-purple-500/30 hover:bg-white/[0.04] sm:gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-fuchsia-300/60 bg-gradient-to-br from-purple-600 to-blue-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                {initial}
              </span>

              <span className="hidden max-w-28 truncate text-xs font-bold text-slate-200 sm:block">
                {studentName}
              </span>

              <span className="hidden text-xs text-slate-400 sm:block">
                ⌄
              </span>
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-12 z-[60] w-64 rounded-2xl border border-purple-500/30 bg-[#11152b]/95 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                {/* Account information */}
                <div className="border-b border-white/10 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-sm font-bold text-white">
                      {initial}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {studentName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {student?.email || "Student account"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu links */}
                <div className="mt-2 space-y-1">

                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-purple-500/10 hover:text-white"
                  >
                    <span>👤</span>
                    My Dashboard / Profile
                  </Link>

                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-purple-500/10 hover:text-white"
                  >
                    <span>🎓</span>
                    Academic Details
                  </Link>

                  <Link
                    href="/applications"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-purple-500/10 hover:text-white"
                  >
                    <span>💼</span>
                    My Applications
                  </Link>

                  <Link
                    href="/recommendations"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-purple-500/10 hover:text-white"
                  >
                    <span>✨</span>
                    Find Internships
                  </Link>
                </div>

                {/* Sign out */}
                <div className="mt-2 border-t border-white/10 pt-2">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <span>↪</span>
                    {loggingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={
              mobileOpen ? "Close navigation" : "Open navigation"
            }
            aria-expanded={mobileOpen}
            className="rounded-xl border border-white/10 p-2 text-slate-300 hover:border-purple-400/40 hover:text-white xl:hidden"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav
          className="border-t border-white/10 bg-[#090b1b] px-5 py-3 xl:hidden"
          aria-label="Mobile student navigation"
        >
          <div className="mx-auto flex max-w-[1700px] flex-wrap gap-2">
            {links.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
