"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HistoryItem = {
  status: string;
  notes?: string;
  changed_at?: string;
};

type Application = {
  application_id: number;
  opportunity_id: number;
  applied_date: string;
  current_stage: string;
  status: string;
  match_score: number | null;
  candidate_name: string;
  title: string;
  opportunity_type: string;
  company_name: string;
  history: HistoryItem[];
};

const statusOptions = [
  "All",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
];

function formatDate(value?: string) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: string) {
  switch (status?.toLowerCase()) {
    case "offer":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "interview":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    case "assessment":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "rejected":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default:
      return "border-purple-400/30 bg-purple-400/10 text-purple-300";
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/applications", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load your applications."
          );
        }

        if (active) {
          setApplications(data.applications || []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter(
        (app) => (app.status || app.current_stage) === "Applied"
      ).length,
      interviews: applications.filter(
        (app) => (app.status || app.current_stage) === "Interview"
      ).length,
      offers: applications.filter(
        (app) => (app.status || app.current_stage) === "Offer"
      ).length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const status = app.status || app.current_stage || "Applied";

      const matchesFilter =
        activeFilter === "All" || status === activeFilter;

      const searchText =
        `${app.title} ${app.company_name} ${app.opportunity_type}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [applications, activeFilter, search]);

  return (
    <main className="min-h-screen bg-[#080b18] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080b18]/95 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-[76px] max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 py-3 lg:px-16">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-4xl font-bold text-purple-500">✥</span>
            <span className="text-2xl font-extrabold tracking-tight">
              InternHub
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-300 sm:gap-8">
            <Link href="/" className="transition hover:text-purple-400">
              Home
            </Link>
            <Link
              href="/recommendations"
              className="transition hover:text-purple-400"
            >
              Jobs
            </Link>
            <Link
              href="/companies"
              className="transition hover:text-purple-400"
            >
              Companies
            </Link>
            <Link
              href="/stipend-insights"
              className="transition hover:text-purple-400"
            >
              Stipend Insights
            </Link>
            <Link
              href="/applications"
              className="border-b-2 border-purple-500 py-2 text-white"
            >
              My Applications
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-12">
        <section className="relative mb-9 overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-br from-[#17152e] via-[#10172c] to-[#0b1020] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-purple-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-bold tracking-wider text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              YOUR CAREER DASHBOARD
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              My Applications
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Keep track of every opportunity you have applied for.
              Follow your application progress and stay updated on
              your recruitment journey.
            </p>

            <Link
              href="/recommendations"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-bold shadow-lg shadow-purple-900/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-purple-500"
            >
              Explore Opportunities <span>→</span>
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-24 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-400" />
            <p className="mt-5 text-sm text-slate-400">
              Loading your applications...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-8 text-center">
            <div className="text-3xl">⚠</div>
            <h2 className="mt-3 text-lg font-bold text-rose-300">
              Unable to load applications
            </h2>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold hover:bg-purple-500"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Applications",
                  value: counts.total,
                  icon: "▤",
                  color: "text-purple-300",
                  glow: "bg-purple-500/10",
                },
                {
                  label: "Applied",
                  value: counts.applied,
                  icon: "◷",
                  color: "text-blue-300",
                  glow: "bg-blue-500/10",
                },
                {
                  label: "Interviews",
                  value: counts.interviews,
                  icon: "♙",
                  color: "text-cyan-300",
                  glow: "bg-cyan-500/10",
                },
                {
                  label: "Offers",
                  value: counts.offers,
                  icon: "✦",
                  color: "text-emerald-300",
                  glow: "bg-emerald-500/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-[#101629] p-5 transition hover:-translate-y-1 hover:border-purple-400/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.glow} text-xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-extrabold">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            <section>
              <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-bold">Application Tracker</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    View your submitted applications and their latest status.
                  </p>
                </div>

                <div className="w-full md:max-w-sm">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search job or company..."
                    className="w-full rounded-xl border border-white/10 bg-[#11182b] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      activeFilter === status
                        ? "border-purple-400 bg-purple-500/20 text-purple-200"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-purple-400/40 hover:text-white"
                    }`}
                  >
                    {status}
                    {status === "All" && (
                      <span className="ml-2 text-purple-300">
                        {applications.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {filteredApplications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
                  <div className="text-4xl">📂</div>
                  <h3 className="mt-4 text-xl font-bold">
                    {applications.length === 0
                      ? "No applications yet"
                      : "No matching applications"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {applications.length === 0
                      ? "When you apply for an opportunity, it will appear here with its application status and history."
                      : "Try changing your search or selecting another status filter."}
                  </p>
                  {applications.length === 0 && (
                    <Link
                      href="/recommendations"
                      className="mt-6 inline-flex rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold hover:bg-purple-500"
                    >
                      Browse Opportunities
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app) => {
                    const status =
                      app.status || app.current_stage || "Applied";
                    const isExpanded = expandedId === app.application_id;
                    const history = app.history || [];

                    return (
                      <article
                        key={app.application_id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#11192b] to-[#0c1221] transition hover:border-purple-400/30"
                      >
                        <div className="p-5 sm:p-7">
                          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                            <div className="flex min-w-0 gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-2xl font-extrabold text-purple-300">
                                {(app.company_name || "C")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h3 className="break-words text-lg font-bold text-white sm:text-xl">
                                  {app.title}
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  {app.company_name}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                                    {app.opportunity_type}
                                  </span>
                                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                                    Applied {formatDate(app.applied_date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                              <span
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(status)}`}
                              >
                                {status}
                              </span>
                              {app.match_score !== null &&
                                app.match_score !== undefined && (
                                  <span className="text-xs text-slate-400">
                                    {Number(app.match_score)}% match
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <span className="text-xs text-slate-500">
                              Application ID: #{app.application_id}
                            </span>

                            <button
                              onClick={() =>
                                setExpandedId(
                                  isExpanded ? null : app.application_id
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-400/5 px-4 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-400/10"
                            >
                              {isExpanded ? "Hide Timeline" : "View Timeline"}
                              <span>{isExpanded ? "↑" : "↓"}</span>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-6 rounded-xl border border-white/10 bg-[#090f1d] p-5">
                              <h4 className="mb-5 text-sm font-bold text-white">
                                Application Status History
                              </h4>

                              {history.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No additional status history available.
                                </p>
                              ) : (
                                <div className="space-y-5">
                                  {history.map((item, index) => (
                                    <div
                                      key={`${app.application_id}-${index}`}
                                      className="relative flex gap-4"
                                    >
                                      <div className="flex flex-col items-center">
                                        <span className="h-3 w-3 rounded-full border-2 border-purple-300 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
                                        {index !== history.length - 1 && (
                                          <span className="mt-1 h-full min-h-8 w-px bg-purple-400/30" />
                                        )}
                                      </div>

                                      <div className="min-w-0 pb-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(item.status)}`}
                                          >
                                            {item.status}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {formatDate(item.changed_at)}
                                          </span>
                                        </div>

                                        {item.notes && (
                                          <p className="mt-2 text-sm leading-6 text-slate-400">
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="mt-16 border-t border-white/10 py-7 text-center text-xs text-slate-500">
          <span className="font-bold text-purple-400">InternHub</span>
          {" "}— Your journey, one opportunity at a time.
        </footer>
      </div>
    </main>
  );
}
