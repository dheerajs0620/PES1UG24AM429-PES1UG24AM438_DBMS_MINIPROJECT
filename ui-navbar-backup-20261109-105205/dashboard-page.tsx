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

  if (value.includes("shortlist") || value === "selected" || value === "offered") return "Shortlisted";
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-purple-500/25 via-fuchsia-500/10 to-blue-500/20 text-xl font-bold text-fuchsia-200 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
      {initials || "IN"}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-xl text-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.12)]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
      </div>
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
            setApplications(Array.isArray(data.applications) ? data.applications : []);
          }
        }

        if (opportunityResponse.ok) {
          const data = await opportunityResponse.json();
          if (active) {
            setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
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

  const statCards = [
    {
      label: "Available Opportunities",
      value: opportunities.length,
      icon: "▱",
      color: "fuchsia",
      description: "Explore available roles",
    },
    {
      label: "Applications Sent",
      value: total,
      icon: "➤",
      color: "blue",
      description: "Your submitted applications",
    },
    {
      label: "Shortlisted",
      value: counts.Shortlisted,
      icon: "♧",
      color: "green",
      description: "Positive responses",
    },
    {
      label: "Interviews",
      value: counts.Interview,
      icon: "◷",
      color: "amber",
      description: "Interview opportunities",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070817] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-fuchsia-500/30 border-t-fuchsia-400 shadow-[0_0_24px_rgba(217,70,239,0.3)]" />
          <p className="text-sm font-medium text-slate-400">Preparing your InternHub workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">
      {/* Ambient background lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 h-[520px] w-[520px] rounded-full bg-purple-700/10 blur-[150px]" />
        <div className="absolute right-[-150px] top-[-100px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute bottom-0 left-[35%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/[0.045] blur-[150px]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-purple-500/25 bg-[#070817]/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1700px] items-center justify-between gap-5 px-5 lg:px-10">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-2xl text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              ✣
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Intern<span className="text-fuchsia-400">Hub</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {[
              { label: "Home", href: "/" },
              { label: "Jobs", href: "/recommendations" },
              { label: "Companies", href: "/recommendations" },
              { label: "Stipend Insights", href: "/recommendations" },
              { label: "Dashboard", href: "/dashboard" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`border-b-2 py-[27px] text-sm transition-all duration-200 ${
                  item.label === "Dashboard"
                    ? "border-fuchsia-500 font-semibold text-white shadow-[0_8px_18px_-12px_#d946ef]"
                    : "border-transparent text-slate-400 hover:border-fuchsia-400/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-xl p-2 text-xl text-slate-300 transition hover:bg-white/5 hover:text-fuchsia-300"
            >
              ♧
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-[#070817]" />
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1.5 transition hover:border-purple-500/30 hover:bg-white/[0.04] sm:gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-300/60 bg-gradient-to-br from-purple-600 to-blue-500 font-bold shadow-[0_0_22px_rgba(168,85,247,0.35)]">
                {firstName[0]?.toUpperCase() || "S"}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{studentName}</span>
              <span className="text-xs text-slate-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-purple-500/30 bg-[#11152b]/95 p-2 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-3 py-3">
                  <p className="truncate text-sm font-semibold">{studentName}</p>
                  <p className="truncate text-xs text-slate-500">{student?.email}</p>
                </div>
                <Link href="/dashboard" className="mt-2 block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                  My Profile
                </Link>
                <Link href="/applications" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                  My Applications
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto border-t border-white/5 px-5 py-3 lg:hidden">
          <Link href="/" className="whitespace-nowrap text-sm text-slate-400">Home</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-slate-400">Jobs</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-slate-400">Companies</Link>
          <Link href="/recommendations" className="whitespace-nowrap text-sm text-slate-400">Stipend Insights</Link>
          <Link href="/dashboard" className="whitespace-nowrap text-sm font-semibold text-fuchsia-400">Dashboard</Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1700px] px-5 py-8 lg:px-10 lg:py-10">
        {/* Welcome */}
        <section className="mb-9 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_#d946ef]" />
              <p className="text-xs font-bold tracking-[0.28em] text-fuchsia-400">YOUR CAREER STARTS HERE</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[42px]">
              Welcome back, <span className="bg-gradient-to-r from-fuchsia-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">{firstName}!</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Track your applications, discover new opportunities, and manage your internship journey.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-purple-400/25 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-5 py-3.5 shadow-[0_0_28px_rgba(124,58,237,0.08)]">
            <span className="text-xl text-fuchsia-400">▦</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Today</p>
              <p className="text-sm font-semibold text-slate-200">{formattedDate}</p>
            </div>
          </div>
        </section>

        {/* Main dashboard grid */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0">
            {/* Statistics */}
            <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#15172f] via-[#101329] to-[#0c1022] p-5 transition duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_12px_35px_rgba(124,58,237,0.12)]"
                >
                  <div className={`absolute -right-8 -top-10 h-32 w-32 rounded-full blur-[55px] ${
                    stat.color === "fuchsia" ? "bg-fuchsia-500/20" :
                    stat.color === "blue" ? "bg-blue-500/20" :
                    stat.color === "green" ? "bg-emerald-500/20" : "bg-amber-500/20"
                  }`} />
                  <div className="relative flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl shadow-lg ${
                      stat.color === "fuchsia" ? "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-300 shadow-fuchsia-500/10" :
                      stat.color === "blue" ? "border-blue-400/30 bg-blue-500/15 text-blue-300 shadow-blue-500/10" :
                      stat.color === "green" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10" :
                      "border-amber-400/30 bg-amber-500/15 text-amber-300 shadow-amber-500/10"
                    }`}>
                      {stat.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-3xl font-extrabold tracking-tight text-white">{stat.value}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{stat.label}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{stat.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Internship opportunities */}
            <section className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#15122d]/95 via-[#101329] to-[#0b1021] p-5 shadow-[0_0_45px_rgba(124,58,237,0.08)] sm:p-7">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <SectionTitle
                  icon="◎"
                  title="Explore Internship Opportunities"
                  subtitle="Discover opportunities available on InternHub."
                />
                <Link
                  href="/recommendations"
                  className="rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 px-5 py-2.5 text-sm font-bold text-fuchsia-200 shadow-[0_0_18px_rgba(168,85,247,0.12)] transition hover:border-fuchsia-300/60 hover:from-purple-600/35 hover:to-fuchsia-600/35"
                >
                  View All <span className="ml-1">→</span>
                </Link>
              </div>

              {opportunities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-purple-400/20 bg-[#090d1d]/70 px-5 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-2xl text-fuchsia-300">◇</div>
                  <p className="font-semibold text-slate-200">No opportunities available right now.</p>
                  <p className="mt-2 text-sm text-slate-500">Check back later for new listings.</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                        className="group grid gap-5 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#11162c] to-[#0d1225] p-5 transition duration-300 hover:border-purple-400/40 hover:bg-[#151a33] hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_auto] md:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <CompanyMark name={company} />
                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-white transition group-hover:text-fuchsia-200">
                              {job.title || "Internship Opportunity"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-400">{company}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {skills.length > 0 ? (
                                skills.map((skill) => (
                                  <span key={skill} className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-200">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500">Skills not specified</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2.5 text-sm text-slate-300">
                          <p className="flex items-center gap-2">
                            <span className="text-base text-fuchsia-400">⌖</span>
                            {job.location || "Location not specified"}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-base text-cyan-400">▣</span>
                            {job.opportunity_type || "Opportunity"}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-base text-amber-400">₹</span>
                            {job.stipend != null ? `₹${job.stipend}` : "Stipend not specified"}
                          </p>
                        </div>

                        <Link
                          href="/recommendations"
                          className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 text-center text-sm font-bold text-white shadow-[0_0_22px_rgba(168,85,247,0.2)] transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_0_28px_rgba(217,70,239,0.35)]"
                        >
                          Explore <span className="ml-1">→</span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent applications */}
            <section className="mt-7 rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#13162d] to-[#0c1021] p-5 sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle
                  icon="▤"
                  title="Recent Applications"
                  subtitle="Your latest application activity"
                />
                <Link href="/applications" className="text-sm font-bold text-fuchsia-400 transition hover:text-fuchsia-300">
                  View All →
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
                  <p className="text-sm text-slate-300">You haven't applied to any opportunities yet.</p>
                  <Link href="/recommendations" className="mt-3 inline-block text-sm font-bold text-fuchsia-400 hover:text-fuchsia-300">
                    Explore internships →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.slice(0, 3).map((app, index) => {
                    const normalized = normalizeStatus(app.status);
                    const color = statusColors[normalized.toLowerCase()];

                    return (
                      <div
                        key={app.application_id ?? index}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-purple-400/25 hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-fuchsia-300">↗</div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{app.job_title || app.title || "Internship"}</p>
                            <p className="mt-1 text-sm text-slate-500">{app.company_name || app.company || "Company"}</p>
                          </div>
                        </div>
                        <span
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                          style={{ borderColor: `${color}55`, backgroundColor: `${color}15`, color }}
                        >
                          {app.status || "Applied"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">
            {/* Application status */}
            <section className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#19132f] via-[#12152b] to-[#0c1224] p-5 shadow-[0_0_35px_rgba(124,58,237,0.08)] sm:p-6">
              <SectionTitle icon="▥" title="Application Status" subtitle="Your application breakdown" />

              <div className="mt-7 flex flex-wrap items-center justify-center gap-6">
                <div
                  className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full shadow-[0_0_35px_rgba(168,85,247,0.13)]"
                  style={{
                    background: total > 0 ? `conic-gradient(${chartGradient})` : "conic-gradient(#29304a 0% 100%)",
                  }}
                >
                  <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#111329] shadow-inner">
                    <span className="text-4xl font-extrabold">{total}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total</span>
                  </div>
                </div>

                <div className="min-w-[145px] flex-1 space-y-4">
                  {chartSegments.filter((item) => item.label !== "Applied").map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: statusColors[item.label.toLowerCase()] }} />
                        {item.label}
                      </span>
                      <span className="font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">
                Based on your current application statuses.
              </div>
            </section>

            {/* Deadlines */}
            <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#15152d] to-[#0d1224] p-5 sm:p-6">
              <SectionTitle icon="▦" title="Upcoming Deadlines" subtitle="Keep track of important dates" />
              <div className="mt-5 rounded-2xl border border-dashed border-purple-400/20 bg-purple-500/[0.035] px-4 py-9 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-xl text-fuchsia-300">◷</div>
                <p className="text-sm font-semibold text-slate-300">No upcoming deadlines available.</p>
                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-slate-500">
                  Deadline information will appear here when provided by an opportunity.
                </p>
              </div>
            </section>

            {/* Quick actions */}
            <section className="rounded-3xl border border-purple-500/25 bg-gradient-to-br from-[#17132f] to-[#0d1225] p-5 shadow-[0_0_30px_rgba(124,58,237,0.06)] sm:p-6">
              <SectionTitle icon="ϟ" title="Quick Actions" subtitle="Jump back into your journey" />

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  { href: "/recommendations", icon: "⇧", label: "Update Resume" },
                  { href: "/applications", icon: "▤", label: "Applications" },
                  { href: "/recommendations", icon: "▥", label: "Explore Jobs" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-purple-400/20 bg-gradient-to-b from-purple-500/10 to-blue-500/[0.04] p-3 text-center transition duration-200 hover:-translate-y-1 hover:border-fuchsia-400/50 hover:bg-purple-500/15 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                  >
                    <span className="text-3xl text-fuchsia-300 transition group-hover:scale-110 group-hover:text-white">{action.icon}</span>
                    <span className="text-[11px] font-semibold leading-4 text-slate-300 group-hover:text-white">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Profile */}
            <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#15172e] to-[#0c1122] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/50 bg-gradient-to-br from-purple-600 to-blue-500 text-lg font-bold shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  {firstName[0]?.toUpperCase() || "S"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{studentName}</p>
                  <p className="truncate text-xs text-slate-500">{student?.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="mt-5 block rounded-xl border border-purple-400/25 bg-purple-500/[0.06] py-3 text-center text-sm font-semibold text-slate-300 transition hover:border-fuchsia-400/50 hover:bg-purple-500/15 hover:text-white"
              >
                Manage Profile →
              </Link>
            </section>
          </aside>
        </div>

        <footer className="mt-12 border-t border-white/[0.07] py-6 text-center text-xs tracking-wide text-slate-600">
          InternHub <span className="mx-2 text-fuchsia-500">·</span> Student Workspace
        </footer>
      </div>
    </main>
  );
}
