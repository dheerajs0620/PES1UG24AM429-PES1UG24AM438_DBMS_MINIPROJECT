"use client";

import StudentNavbar from "../../components/StudentNavbar";
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

const statusOptions = ["All", "Applied", "Under Review", "Assessment", "Interview", "Offer", "Rejected"];

const pipelineStages = ["Applied", "Under Review", "Assessment", "Interview", "Offer"];

function normalizeStage(value?: string) {
  const status = (value || "Applied").trim().toLowerCase();
  if (["submitted", "application submitted", "applied"].includes(status)) return "Applied";
  if (["under review", "in review", "review", "shortlisted", "screening"].includes(status)) return "Under Review";
  if (["assessment", "test", "online assessment", "coding test"].includes(status)) return "Assessment";
  if (["interview", "interview scheduled", "technical interview", "hr interview"].includes(status)) return "Interview";
  if (["offer", "offered", "selected", "hired"].includes(status)) return "Offer";
  if (["rejected", "declined", "not selected"].includes(status)) return "Rejected";
  return "Under Review";
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusClass(status: string) {
  switch (status?.toLowerCase()) {
    case "offer": return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "interview": return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    case "assessment": return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "rejected": return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default: return "border-purple-400/30 bg-purple-400/10 text-purple-300";
  }
}

function Timeline({ application }: { application: Application }) {
  const history = [...(application.history || [])].sort((a, b) =>
    new Date(a.changed_at || 0).getTime() - new Date(b.changed_at || 0).getTime()
  );
  const current = normalizeStage(application.status || application.current_stage);
  const rejected = current === "Rejected";
  const currentIndex = pipelineStages.indexOf(current);
  const stageHistory = new Map<string, HistoryItem>();
  history.forEach((item) => stageHistory.set(normalizeStage(item.status), item));
  if (!stageHistory.has("Applied")) {
    stageHistory.set("Applied", { status: "Applied", changed_at: application.applied_date });
  }

  return (
    <div className="mt-6 rounded-2xl border border-purple-400/15 bg-[#090d1d]/80 p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">Recruitment journey</p>
          <p className="mt-1 text-xs text-slate-500">Live progress based on recorded application updates</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
          rejected ? "border-rose-400/30 bg-rose-400/10 text-rose-300" :
          "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
        }`}>{rejected ? "Application closed" : `Stage ${Math.max(1, currentIndex + 1)} of ${pipelineStages.length}`}</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="relative grid min-w-[620px] grid-cols-5 gap-2">
          <div className="absolute left-[10%] right-[10%] top-5 h-[3px] rounded-full bg-slate-800" />
          <div
            className="absolute left-[10%] top-5 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-fuchsia-500 transition-all"
            style={{ width: `${(Math.max(0, rejected ? 0 : currentIndex) / (pipelineStages.length - 1)) * 80}%` }}
          />
          {pipelineStages.map((stage, index) => {
            const completed = !rejected && index < currentIndex;
            const active = !rejected && index === currentIndex;
            const item = stageHistory.get(stage);
            const appliedFallback = stage === "Applied" ? application.applied_date : undefined;
            return (
              <div key={stage} className="relative z-10 flex flex-col items-center text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black transition ${
                  completed ? "border-emerald-300 bg-emerald-400 text-[#06251b] shadow-[0_0_18px_rgba(52,211,153,.25)]" :
                  active ? "border-fuchsia-300 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white shadow-[0_0_24px_rgba(217,70,239,.42)] ring-4 ring-fuchsia-500/10" :
                  "border-slate-700 bg-[#151b30] text-slate-500"
                }`}>
                  {completed ? "✓" : active ? "●" : index + 1}
                </div>
                <p className={`mt-3 text-xs font-bold ${completed ? "text-emerald-300" : active ? "text-fuchsia-200" : "text-slate-500"}`}>{stage}</p>
                <p className="mt-1 min-h-4 text-[10px] text-slate-500">
                  {item?.changed_at || appliedFallback ? formatDate(item?.changed_at || appliedFallback) : "Not reached"}
                </p>
                {active && <span className="mt-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">Current</span>}
                {completed && <span className="mt-1 text-[9px] font-semibold text-emerald-400">Completed</span>}
              </div>
            );
          })}
        </div>
      </div>

      {rejected && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">×</span>
          <div>
            <p className="text-xs font-bold text-rose-300">Application rejected</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {formatDate(history.find((item) => normalizeStage(item.status) === "Rejected")?.changed_at)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatIcon({ kind }: { kind: "total" | "applied" | "interview" | "offer" }) {
  const common = "h-8 w-8";
  if (kind === "total") return (
    <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M15 8h18a3 3 0 0 1 3 3v28H12V11a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2.8"/>
      <path d="M19 17h10M19 24h10M19 31h7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M19 5h10v6H19z" fill="currentColor" opacity=".35"/>
    </svg>
  );
  if (kind === "applied") return (
    <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="25" r="16" stroke="currentColor" strokeWidth="2.8"/>
      <path d="M24 15v11l8 5M18 5h12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (kind === "interview") return (
    <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="10" width="34" height="27" rx="5" stroke="currentColor" strokeWidth="2.8"/>
      <path d="M16 19h16M16 25h10M18 37v5m12-5v5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
      <circle cx="34" cy="29" r="2" fill="currentColor"/>
    </svg>
  );
  return (
    <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="m24 5 5.8 11.8L43 19l-9.5 9.2L35.8 41 24 34.8 12.2 41l2.3-12.8L5 19l13.2-2.2L24 5Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/>
      <path d="m18 24 4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
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
          method: "GET", credentials: "include", cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load your applications.");
        }
        if (active) setApplications(data.applications || []);
      } catch (err: any) {
        if (active) setError(err.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadApplications();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    total: applications.length,
    applied: applications.filter((app) => (app.status || app.current_stage) === "Applied").length,
    interviews: applications.filter((app) => (app.status || app.current_stage) === "Interview").length,
    offers: applications.filter((app) => (app.status || app.current_stage) === "Offer").length,
  }), [applications]);

  const filteredApplications = useMemo(() => applications.filter((app) => {
    const status = normalizeStage(app.status || app.current_stage);
    const matchesFilter = activeFilter === "All" || status === activeFilter;
    const searchText = `${app.title} ${app.company_name} ${app.opportunity_type}`.toLowerCase();
    return matchesFilter && searchText.includes(search.toLowerCase());
  }), [applications, activeFilter, search]);

  const stats = [
    { label: "Total Applications", value: counts.total, kind: "total" as const, color: "fuchsia", description: "All submitted opportunities" },
    { label: "Applied", value: counts.applied, kind: "applied" as const, color: "blue", description: "Awaiting the next update" },
    { label: "Interviews", value: counts.interviews, kind: "interview" as const, color: "cyan", description: "Interview opportunities" },
    { label: "Offers", value: counts.offers, kind: "offer" as const, color: "green", description: "Positive outcomes" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 h-[520px] w-[520px] rounded-full bg-purple-700/10 blur-[150px]" />
        <div className="absolute right-[-150px] top-[-100px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute bottom-0 left-[35%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/[0.045] blur-[150px]" />
      </div>

      <StudentNavbar />

      <div className="relative mx-auto max-w-[1700px] px-5 py-8 lg:px-10 lg:py-10">
        <section className="mb-9 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_#d946ef]" />
              <p className="text-xs font-bold tracking-[0.28em] text-fuchsia-400">YOUR CAREER DASHBOARD</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[42px]">My Applications</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Keep track of every opportunity you have applied for. Follow your application progress and stay updated on your recruitment journey.
            </p>
          </div>
          <Link href="/recommendations" className="rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 px-5 py-3 text-sm font-bold text-fuchsia-200 shadow-[0_0_18px_rgba(168,85,247,0.12)] transition hover:-translate-y-0.5 hover:border-fuchsia-300/60 hover:from-purple-600/35 hover:to-fuchsia-600/35">
            Explore Opportunities <span className="ml-1">→</span>
          </Link>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-24 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-400" />
            <p className="mt-5 text-sm text-slate-400">Loading your applications...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-8 text-center">
            <div className="text-3xl">⚠</div>
            <h2 className="mt-3 text-lg font-bold text-rose-300">Unable to load applications</h2>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold hover:bg-purple-500">Try Again</button>
          </div>
        ) : (
          <>
            <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#15172f] via-[#101329] to-[#0c1022] p-5 transition duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_12px_35px_rgba(124,58,237,0.12)]">
                  <div className={`absolute -right-8 -top-10 h-32 w-32 rounded-full blur-[55px] ${
                    stat.color === "fuchsia" ? "bg-fuchsia-500/20" :
                    stat.color === "blue" ? "bg-blue-500/20" :
                    stat.color === "cyan" ? "bg-cyan-500/20" : "bg-emerald-500/20"
                  }`} />
                  <div className="relative flex items-center gap-4">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
                      stat.color === "fuchsia" ? "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-300 shadow-fuchsia-500/10" :
                      stat.color === "blue" ? "border-blue-400/30 bg-blue-500/15 text-blue-300 shadow-blue-500/10" :
                      stat.color === "cyan" ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-300 shadow-cyan-500/10" :
                      "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10"
                    }`}>
                      <StatIcon kind={stat.kind} />
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

            <section>
              <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-bold">Application Tracker</h2>
                  <p className="mt-2 text-sm text-slate-400">View your submitted applications and their latest status.</p>
                </div>
                <div className="w-full md:max-w-sm">
                  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job or company..." className="w-full rounded-xl border border-white/10 bg-[#11182b] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400" />
                </div>
              </div>

              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {statusOptions.map((status) => (
                  <button key={status} onClick={() => setActiveFilter(status)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    activeFilter === status ? "border-purple-400 bg-purple-500/20 text-purple-200" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-purple-400/40 hover:text-white"
                  }`}>
                    {status}
                    {status === "All" && <span className="ml-2 text-purple-300">{applications.length}</span>}
                  </button>
                ))}
              </div>

              {filteredApplications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
                  <div className="text-4xl">📂</div>
                  <h3 className="mt-4 text-xl font-bold">{applications.length === 0 ? "No applications yet" : "No matching applications"}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {applications.length === 0
                      ? "When you apply for an opportunity, it will appear here with its application status and history."
                      : "Try changing your search or selecting another status filter."}
                  </p>
                  {applications.length === 0 && (
                    <Link href="/recommendations" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-bold shadow-[0_0_22px_rgba(168,85,247,0.2)] hover:brightness-110">
                      Browse Opportunities
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app) => {
                    const status = app.status || app.current_stage || "Applied";
                    const isExpanded = expandedId === app.application_id;
                    const history = app.history || [];
                    return (
                      <article key={app.application_id} className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#13182e] to-[#0c1122] transition hover:border-purple-400/30 hover:shadow-[0_10px_35px_rgba(124,58,237,0.08)]">
                        <div className="p-5 sm:p-7">
                          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                            <div className="flex min-w-0 gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 text-2xl font-extrabold text-purple-200 shadow-[0_0_22px_rgba(168,85,247,0.10)]">
                                {(app.company_name || "C").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="break-words text-lg font-bold text-white sm:text-xl">{app.title}</h3>
                                <p className="mt-1 text-sm text-slate-400">{app.company_name}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">{app.opportunity_type}</span>
                                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">Applied {formatDate(app.applied_date)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(status)}`}>{status}</span>
                              {app.match_score !== null && app.match_score !== undefined && <span className="text-xs text-slate-400">{Number(app.match_score)}% match</span>}
                            </div>
                          </div>

                          <Timeline application={app} />

                          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <span className="text-xs text-slate-500">Application ID: #{app.application_id}</span>
                            <button onClick={() => setExpandedId(isExpanded ? null : app.application_id)} className="inline-flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-400/5 px-4 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-400/10">
                              {isExpanded ? "Hide Timeline" : "View Timeline"} <span>{isExpanded ? "↑" : "↓"}</span>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-6 rounded-xl border border-white/10 bg-[#090f1d] p-5">
                              <h4 className="mb-5 text-sm font-bold text-white">Activity & recruiter updates</h4>
                              {history.length === 0 ? (
                                <p className="text-sm text-slate-500">No additional status history available.</p>
                              ) : (
                                <div className="space-y-5">
                                  {history.map((item, index) => (
                                    <div key={`${app.application_id}-${index}`} className="relative flex gap-4">
                                      <div className="flex flex-col items-center">
                                        <span className="h-3 w-3 rounded-full border-2 border-purple-300 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
                                        {index !== history.length - 1 && <span className="mt-1 h-full min-h-8 w-px bg-purple-400/30" />}
                                      </div>
                                      <div className="min-w-0 pb-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(item.status)}`}>{item.status}</span>
                                          <span className="text-xs text-slate-500">{formatDate(item.changed_at)}</span>
                                        </div>
                                        {item.notes && <p className="mt-2 text-sm leading-6 text-slate-400">{item.notes}</p>}
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
          <span className="font-bold text-purple-400">InternHub</span> — Your journey, one opportunity at a time.
        </footer>
      </div>
    </main>
  );
}
