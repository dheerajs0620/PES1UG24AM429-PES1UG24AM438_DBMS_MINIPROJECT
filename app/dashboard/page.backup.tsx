"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Student = {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
};

type Application = {
  application_id?: number;
  opportunity_id?: number;
  job_title?: string;
  title?: string;
  company_name?: string;
  company?: string;
  status?: string;
  applied_at?: string;
};

type Opportunity = {
  opportunity_id?: number;
  title?: string;
  company_name?: string;
  opportunity_type?: string;
  description?: string;
  required_skills?: string;
  location?: string;
  stipend?: string | number;
};

const statusColors: Record<string, string> = {
  shortlisted: "#16d98b",
  "under review": "#159cf5",
  interview: "#a855f7",
  rejected: "#737b9d",
  applied: "#e6a23c",
  selected: "#16d98b",
  offered: "#16d98b",
};

function normalizeStatus(status?: string) {
  const value = (status || "Applied").toLowerCase().trim();

  if (value.includes("shortlist") || value === "selected" || value === "offered") {
    return "Shortlisted";
  }
  if (value.includes("interview")) return "Interview";
  if (value.includes("review") || value.includes("screen")) return "Under Review";
  if (value.includes("reject")) return "Rejected";
  return "Applied";
}

function CompanyMark({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/20 to-blue-500/10 text-xl font-bold text-purple-200">
      {initials || "IN"}
    </div>
  );
}

export default function StudentDashboard() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const authResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!authResponse.ok) {
          router.replace("/login");
          return;
        }

        const authData = await authResponse.json();

        if (!authData.success || !authData.user) {
          router.replace("/login");
          return;
        }

        if (!active) return;

        setStudent({
          ...authData.user,
          name: `${authData.user.first_name || ""} ${authData.user.last_name || ""}`.trim(),
        });

        const [applicationResponse, opportunityResponse] = await Promise.all([
          fetch("/api/applications", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/dashboard", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (applicationResponse.ok) {
          const data = await applicationResponse.json();
          if (active) {
            setApplications(
              Array.isArray(data.applications) ? data.applications : []
            );
          }
        }

        if (opportunityResponse.ok) {
          const data = await opportunityResponse.json();
          if (active) {
            setOpportunities(
              Array.isArray(data.opportunities) ? data.opportunities : []
            );
          }
        }
      } catch (error) {
        console.error("Dashboard loading failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  const studentName =
    student?.name?.trim() ||
    student?.email?.split("@")[0] ||
    "Student";

  const firstName = studentName.split(" ")[0];

  const counts = useMemo(() => {
    const result = {
      Shortlisted: 0,
      "Under Review": 0,
      Interview: 0,
      Rejected: 0,
      Applied: 0,
    };

    applications.forEach((app) => {
      const status = normalizeStatus(app.status);
      result[status]++;
    });

    return result;
  }, [applications]);

  const total = applications.length;

  const chartSegments = [
    { label: "Shortlisted", value: counts.Shortlisted },
    { label: "Under Review", value: counts["Under Review"] },
    { label: "Interview", value: counts.Interview },
    { label: "Rejected", value: counts.Rejected },
    { label: "Applied", value: counts.Applied },
  ];

  let chartOffset = 0;
  const chartGradient = chartSegments
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = chartOffset;
      chartOffset += total ? (item.value / total) * 100 : 0;
      return `${statusColors[item.label.toLowerCase()]} ${start}% ${chartOffset}%`;
    })
    .join(", ");

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050817] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Preparing your InternHub workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050817] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-32 h-96 w-96 rounded-full bg-purple-700/10 blur-[140px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-[#070b1a]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1700px] items-center justify-between gap-5 px-5 lg:px-10">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-xl text-fuchsia-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              ✣
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Intern<span className="text-fuchsia-400">Hub</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {[
              { label: "Home", href: "/" },
              { label: "Jobs", href: "/recommendations" },
              { label: "Companies", href: "/recommendations" },
              { label: "Stipend Insights", href: "/stipend-insights" },
              { label: "Dashboard", href: "/dashboard" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`border-b-2 py-7 text-sm transition ${
                  item.label === "Dashboard"
                    ? "border-fuchsia-500 font-semibold text-white shadow-[0_8px_18px_-12px_#d946ef]"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-xl p-2 text-2xl text-gray-300 transition hover:bg-white/5"
            >
              ♧
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-fuchsia-500 ring-2 ring-[#070b1a]" />
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-400 bg-gradient-to-br from-purple-600 to-fuchsia-500 font-bold shadow-[0_0_18px_rgba(217,70,239,0.3)]">
                {firstName[0]?.toUpperCase() || "S"}
              </span>
              <span className="hidden text-sm font-medium sm:block">{studentName}</span>
              <span className="text-gray-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-52 rounded-xl border border-purple-500/30 bg-[#11172b] p-2 shadow-2xl">
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  My Profile
                </Link>
                <Link
                  href="/applications"
                  className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  My Applications
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto border-t border-white/5 px-5 py-3 lg:hidden">
          <Link href="/" className="whitespace-nowrap text-sm text-gray-400">Home</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-gray-400">Jobs</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-gray-400">Companies</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-gray-400">Stipend Insights</Link>
          <Link href="/dashboard" className="whitespace-nowrap text-sm font-semibold text-fuchsia-400">Dashboard</Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1700px] px-5 py-8 lg:px-10 lg:py-9">
        {/* WELCOME */}
        <section className="mb-7 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-fuchsia-400">
              STUDENT DASHBOARD
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, <span className="text-fuchsia-400">{firstName}!</span>
            </h1>
            <p className="mt-2 text-sm text-gray-400 sm:text-base">
              Track your applications, discover new opportunities, and manage your internship journey.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-sm text-gray-200">
            <span className="text-lg text-fuchsia-400">▦</span>
            {formattedDate}
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0">
            {/* STAT CARDS */}
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {[
                {
                  label: "Available Opportunities",
                  value: opportunities.length,
                  icon: "▱",
                  tone: "fuchsia",
                },
                {
                  label: "Applications Sent",
                  value: total,
                  icon: "➤",
                  tone: "blue",
                },
                {
                  label: "Shortlisted",
                  value: counts.Shortlisted,
                  icon: "♧",
                  tone: "green",
                },
                {
                  label: "Interviews",
                  value: counts.Interview,
                  icon: "◷",
                  tone: "amber",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#11152c] to-[#0b1022] p-5 transition hover:-translate-y-1 hover:border-purple-500/50"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${
                      stat.tone === "fuchsia"
                        ? "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-400"
                        : stat.tone === "blue"
                        ? "border-blue-500/30 bg-blue-500/15 text-blue-400"
                        : stat.tone === "green"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* RECOMMENDATIONS */}
            <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#12102b] via-[#0d1227] to-[#090f20] p-5 shadow-[0_0_35px_rgba(124,58,237,0.08)] sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl text-fuchsia-400">◎</div>
                  <div>
                    <h2 className="text-xl font-bold sm:text-2xl">
                      Explore Internship Opportunities
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Discover opportunities available on InternHub.
                    </p>
                  </div>
                </div>
                <Link
                  href="/recommendations"
                  className="rounded-full bg-purple-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-300 transition hover:bg-purple-600/40"
                >
                  View All →
                </Link>
              </div>

              {opportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                  <p className="text-gray-300">No opportunities available right now.</p>
                  <p className="mt-2 text-sm text-gray-500">Check back later for new listings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.slice(0, 4).map((job, index) => {
                    const company = job.company_name || "Company";
                    const skills = (job.required_skills || "")
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter(Boolean)
                      .slice(0, 4);

                    return (
                      <article
                        key={job.opportunity_id ?? index}
                        className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b1022]/80 p-4 transition hover:border-purple-500/50 hover:bg-[#11162d] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <CompanyMark name={company} />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">
                              {job.title || "Internship Opportunity"}
                            </h3>
                            <p className="mt-1 text-sm text-gray-400">{company}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {skills.length > 0 ? (
                                skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs text-purple-200"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">
                                  Skills not specified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-300">
                          <p className="flex items-center gap-2">
                            <span className="text-fuchsia-400">⌖</span>
                            {job.location || job.opportunity_type || "Location not specified"}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-fuchsia-400">▣</span>
                            {job.opportunity_type || "Opportunity"}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-fuchsia-400">₹</span>
                            {job.stipend != null ? `₹${job.stipend}` : "Stipend not specified"}
                          </p>
                        </div>

                        <Link
                          href="/recommendations"
                          className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-center text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.18)] transition hover:brightness-110"
                        >
                          Explore →
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* RECENT APPLICATIONS */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1328] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Recent Applications</h2>
                  <p className="mt-1 text-sm text-gray-500">Your latest application activity</p>
                </div>
                <Link href="/applications" className="text-sm font-semibold text-fuchsia-400 hover:text-fuchsia-300">
                  View All →
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
                  <p className="text-gray-300">You haven't applied to any opportunities yet.</p>
                  <Link href="/recommendations" className="mt-3 inline-block text-sm font-semibold text-fuchsia-400">
                    Explore internships →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.slice(0, 3).map((app, index) => (
                    <div
                      key={app.application_id ?? index}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {app.job_title || app.title || "Internship"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {app.company_name || app.company || "Company"}
                        </p>
                      </div>
                      <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-300">
                        {app.status || "Applied"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-5">
            {/* APPLICATION STATUS */}
            <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#17112d] to-[#0c1328] p-5">
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="text-xl text-fuchsia-400">▥</span>
                Application Status
              </h2>

              <div className="mt-5 flex flex-wrap items-center justify-around gap-5">
                <div
                  className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      total > 0
                        ? `conic-gradient(${chartGradient})`
                        : "conic-gradient(#252c43 0% 100%)",
                  }}
                >
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#11142a]">
                    <span className="text-3xl font-bold">{total}</span>
                    <span className="text-xs text-gray-400">Total</span>
                  </div>
                </div>

                <div className="min-w-[145px] flex-1 space-y-3">
                  {chartSegments.filter((item) => item.label !== "Applied").map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-gray-300">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: statusColors[item.label.toLowerCase()] }}
                        />
                        {item.label}
                      </span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-500">
                Based on your current application statuses.
              </div>
            </section>

            {/* DEADLINES */}
            <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#17112d] to-[#0c1328] p-5">
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="text-xl text-fuchsia-400">▦</span>
                Upcoming Deadlines
              </h2>
              <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-7 text-center">
                <p className="text-sm text-gray-300">No upcoming deadlines available.</p>
                <p className="mt-2 text-xs text-gray-500">
                  Deadline information will appear here when provided by an opportunity.
                </p>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#17112d] to-[#0c1328] p-5">
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="text-xl text-fuchsia-400">ϟ</span>
                Quick Actions
              </h2>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Link
                  href="/recommendations"
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/40 bg-purple-500/10 p-3 text-center transition hover:bg-purple-500/20"
                >
                  <span className="text-3xl text-fuchsia-300">⇧</span>
                  <span className="text-xs font-medium">Update Resume</span>
                </Link>
                <Link
                  href="/applications"
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/40 bg-purple-500/10 p-3 text-center transition hover:bg-purple-500/20"
                >
                  <span className="text-3xl text-fuchsia-300">▤</span>
                  <span className="text-xs font-medium">View Applications</span>
                </Link>
                <Link
                  href="/recommendations"
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/40 bg-purple-500/10 p-3 text-center transition hover:bg-purple-500/20"
                >
                  <span className="text-3xl text-fuchsia-300">▥</span>
                  <span className="text-xs font-medium">Stipend Insights</span>
                </Link>
              </div>
            </section>

            {/* PROFILE CARD */}
            <section className="rounded-2xl border border-white/10 bg-[#0d1328] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-lg font-bold">
                  {firstName[0]?.toUpperCase() || "S"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{studentName}</p>
                  <p className="truncate text-xs text-gray-500">{student?.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="mt-4 block rounded-lg border border-white/10 py-2.5 text-center text-sm text-gray-300 transition hover:border-purple-500/40 hover:text-white"
              >
                Manage Profile →
              </Link>
            </section>
          </aside>
        </div>

        <footer className="mt-10 border-t border-white/10 py-5 text-center text-xs text-gray-600">
          InternHub · Student Workspace
        </footer>
      </div>
    </main>
  );
}

