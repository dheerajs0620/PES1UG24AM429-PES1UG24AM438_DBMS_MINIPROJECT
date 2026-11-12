
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ModuleKey =
  | "overview"
  | "students"
  | "companies"
  | "internships"
  | "applications"
  | "analytics";

type DashboardData = {
  overview: Record<string, number | string>;
  students: any[];
  companies: any[];
  opportunities: any[];
  applications: any[];
  analytics: {
    application_stages: any[];
    monthly_registrations: any[];
    opportunity_types: any[];
    company_industries: any[];
  };
};

const emptyData: DashboardData = {
  overview: {},
  students: [],
  companies: [],
  opportunities: [],
  applications: [],
  analytics: {
    application_stages: [],
    monthly_registrations: [],
    opportunity_types: [],
    company_industries: [],
  },
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
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

  const paths: Record<string, React.ReactNode> = {
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
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="m18 6-12 12M6 6l12 12" />,
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] ?? <circle cx="12" cy="12" r="9" />}</svg>;
}

function Metric({
  title,
  value,
  detail,
  icon,
  tone = "violet",
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: string;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    violet:
      "from-violet-500/[0.13] via-fuchsia-500/[0.055] to-[#101126] border-violet-400/20 text-violet-300",
    cyan:
      "from-blue-500/[0.13] via-cyan-500/[0.055] to-[#101426] border-cyan-400/20 text-cyan-300",
    amber:
      "from-amber-500/[0.12] via-orange-500/[0.05] to-[#15111d] border-amber-400/20 text-amber-300",
    green:
      "from-emerald-500/[0.12] via-teal-500/[0.05] to-[#0d171c] border-emerald-400/20 text-emerald-300",
    rose:
      "from-rose-500/[0.12] via-pink-500/[0.05] to-[#17101b] border-rose-400/20 text-rose-300",
  };

  return (
    <div
      className={`group relative isolate flex min-h-[108px] items-center gap-5 overflow-hidden rounded-2xl border bg-gradient-to-br ${
        tones[tone] ?? tones.violet
      } px-5 py-4 shadow-[0_12px_38px_rgba(0,0,0,.16)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_42px_rgba(139,92,246,.13)]`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_50%,rgba(168,85,247,.12),transparent_34%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative grid h-[58px] w-[58px] shrink-0 place-items-center rounded-2xl text-current drop-shadow-[0_0_13px_currentColor]">
        <span className="pointer-events-none absolute inset-1 rounded-full bg-current opacity-[0.12] blur-xl" />
        <Icon name={icon} size={36} />
      </div>

      <div className="relative min-w-0">
        <p className="text-[30px] font-extrabold leading-none tracking-tight text-white">
          {Number(value || 0).toLocaleString("en-IN")}
        </p>
        <p className="mt-2 text-[12px] font-bold leading-tight text-slate-200">
          {title}
        </p>
        <p className="mt-1.5 text-[10px] leading-tight text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-violet-400/15 bg-[#0d0d20]/95 shadow-[0_18px_60px_rgba(0,0,0,.18)]">
      <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Status({ value }: { value: string }) {
  const v = String(value || "Unknown");

  const color = ["APPROVED", "Open", "Offer", "Passed"].includes(v)
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : ["PENDING", "Applied", "Assessment", "Interview"].includes(v)
      ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
      : ["REJECTED", "Closed", "Rejected", "Failed"].includes(v)
        ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
        : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}
    >
      {v}
    </span>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
        <Icon name="file" size={22} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-300">
        No {label} found
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Records will appear here when they are available.
      </p>
    </div>
  );
}

/* Vertical bar chart used by Platform Analytics and Overview */
function BarList({
  items,
  labelKey,
  valueKey,
}: {
  items: any[];
  labelKey: string;
  valueKey: string;
}) {
  if (!items?.length) {
    return <Empty label="analytics data" />;
  }

  const values = items.map((item) => Number(item[valueKey] || 0));
  const maxValue = Math.max(1, ...values);
  const chartHeight = 190;

  return (
    <div className="overflow-x-auto p-5">
      <div
        role="img"
        aria-label={`Bar chart showing ${items.length} categories`}
        className="min-w-0"
      >
        <div className="relative">
          {/* Y-axis labels and grid lines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[190px] flex-col justify-between">
            {[4, 3, 2, 1, 0].map((line) => (
              <div
                key={line}
                className="relative border-t border-dashed border-white/[0.09]"
              >
                <span className="absolute -top-3 left-0 text-[10px] text-slate-500">
                  {Math.round((maxValue * line) / 4).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>

          {/* Bars */}
          <div
            className="relative grid gap-3 pl-10"
            style={{
              gridTemplateColumns: `repeat(${items.length}, minmax(48px, 1fr))`,
              minWidth: `${Math.max(items.length * 65, 220)}px`,
            }}
          >
            {items.map((item, index) => {
              const value = Number(item[valueKey] || 0);
              const barHeight =
                value > 0 ? Math.max((value / maxValue) * chartHeight, 5) : 0;

              return (
                <div
                  key={`${item[labelKey]}-${index}`}
                  className="flex min-w-0 flex-col items-center"
                  title={`${item[labelKey]}: ${value.toLocaleString("en-IN")}`}
                >
                  <div className="flex h-[190px] w-full items-end justify-center">
                    <div
                      className="flex w-full max-w-[42px] flex-col items-center justify-end"
                      style={{ height: `${chartHeight}px` }}
                    >
                      <span className="mb-2 text-xs font-bold tabular-nums text-slate-200">
                        {value.toLocaleString("en-IN")}
                      </span>

                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 via-purple-500 to-fuchsia-400 shadow-[0_0_18px_rgba(168,85,247,0.18)] transition-all duration-500 hover:brightness-125"
                        style={{ height: `${barHeight}px` }}
                      />
                    </div>
                  </div>

                  <span className="mt-3 w-full truncate text-center text-[10px] font-medium text-slate-400">
                    {String(item[labelKey] ?? "—")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function dateLabel(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();

  const [active, setActive] = useState<ModuleKey>("overview");
  const [data, setData] = useState<DashboardData>(emptyData);
  const [adminEmail, setAdminEmail] = useState("Super Admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [applicationFilter, setApplicationFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meResponse, dashboardResponse] = await Promise.all([
        fetch("/api/admin/me", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/dashboard", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (
        [meResponse.status, dashboardResponse.status].some(
          (status) => status === 401 || status === 403
        )
      ) {
        router.replace("/admin/login");
        return;
      }

      const me = await meResponse.json();
      const dashboard = await dashboardResponse.json();

      if (!meResponse.ok || !me.success) {
        throw new Error(
          me.message || "Unable to verify administrator session."
        );
      }

      if (!dashboardResponse.ok || !dashboard.success) {
        throw new Error(
          dashboard.message || "Unable to load dashboard data."
        );
      }

      setAdminEmail(me.user?.email || "Super Admin");

      setData({
        ...emptyData,
        ...dashboard,
        analytics: {
          ...emptyData.analytics,
          ...(dashboard.analytics || {}),
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const overview = data.overview;

  const totalStudents = Number(overview.student_accounts || 0);
  const totalCompanies = Number(overview.company_accounts || 0);
  const totalOpportunities = Number(overview.total_opportunities || 0);
  const totalApplications = Number(overview.total_applications || 0);

  const filteredStudents = useMemo(
    () =>
      data.students.filter((row) =>
        [
          row.first_name,
          row.last_name,
          row.email,
          row.major,
          row.college,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search.toLowerCase())
        )
      ),
    [data.students, search]
  );

  const filteredCompanies = useMemo(
    () =>
      data.companies.filter(
        (row) =>
          (companyFilter === "ALL" ||
            row.approval_status === companyFilter) &&
          [
            row.company_name,
            row.email,
            row.industry,
            row.location,
            row.first_name,
            row.last_name,
          ].some((value) =>
            String(value || "").toLowerCase().includes(search.toLowerCase())
          )
      ),
    [data.companies, companyFilter, search]
  );

  const filteredOpportunities = useMemo(
    () =>
      data.opportunities.filter((row) =>
        [
          row.title,
          row.company_name,
          row.opportunity_type,
          row.status,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search.toLowerCase())
        )
      ),
    [data.opportunities, search]
  );

  const filteredApplications = useMemo(
    () =>
      data.applications.filter(
        (row) =>
          (applicationFilter === "ALL" ||
            row.current_stage === applicationFilter) &&
          [
            row.candidate_name,
            row.candidate_email,
            row.opportunity_title,
            row.company_name,
            row.current_stage,
          ].some((value) =>
            String(value || "").toLowerCase().includes(search.toLowerCase())
          )
      ),
    [data.applications, applicationFilter, search]
  );

  async function updateApproval(
    companyId: number,
    approval_status: "APPROVED" | "REJECTED"
  ) {
    const company = data.companies.find(
      (item) => Number(item.company_id) === companyId
    );

    if (
      !company ||
      !window.confirm(
        `Are you sure you want to ${approval_status.toLowerCase()} ${company.company_name}?`
      )
    ) {
      return;
    }

    setBusyId(companyId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ approval_status }),
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update company approval."
        );
      }

      setNotice(
        `${company.company_name} was ${approval_status.toLowerCase()} successfully.`
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update company approval."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const nav: {
    id: ModuleKey;
    label: string;
    icon: string;
    count?: number;
  }[] = [
    { id: "overview", label: "Platform overview", icon: "grid" },
    {
      id: "students",
      label: "Student management",
      icon: "users",
      count: totalStudents,
    },
    {
      id: "companies",
      label: "Company management",
      icon: "building",
      count: data.companies.length,
    },
    {
      id: "internships",
      label: "Internship management",
      icon: "briefcase",
      count: totalOpportunities,
    },
    {
      id: "applications",
      label: "Application monitoring",
      icon: "file",
      count: totalApplications,
    },
    { id: "analytics", label: "Platform analytics", icon: "chart" },
  ];

  const pageTitle =
    nav.find((item) => item.id === active)?.label || "Platform overview";

  return (
    <main className="min-h-screen bg-[#080816] text-white">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        body {
          background: #080816;
        }
        .ih-scroll::-webkit-scrollbar {
          height: 7px;
          width: 7px;
        }
        .ih-scroll::-webkit-scrollbar-thumb {
          background: #39305e;
          border-radius: 20px;
        }
        .ih-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-violet-400/15 bg-[#090918]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1700px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-2xl font-semibold text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              ∞
            </div>

            <div>
              <div className="text-xl font-extrabold tracking-tight">
                Intern<span className="text-fuchsia-400">Hub</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
                Super Admin Control Center
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] text-slate-500">Signed in as</p>
              <p className="max-w-[220px] truncate text-sm font-semibold text-slate-200">
                {adminEmail}
              </p>
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-full border border-fuchsia-300/30 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold shadow-lg shadow-fuchsia-950/30">
              SA
            </div>

            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-300 transition hover:border-rose-400/40 hover:text-white"
            >
              <Icon name="logout" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-violet-400/15 bg-[#0d0d20] p-3 lg:sticky lg:top-[96px]">
          <div className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[.22em] text-slate-600">
            Administration
          </div>

          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setSearch("");
                }}
                className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] font-semibold transition sm:text-sm ${
                  active === item.id
                    ? "border border-fuchsia-400/25 bg-gradient-to-r from-violet-600/25 to-fuchsia-600/10 text-fuchsia-200 shadow-[inset_0_0_25px_rgba(192,38,211,.05)]"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="shrink-0">
                  <Icon name={item.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count !== undefined && (
                  <span className="hidden rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400 lg:inline">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Icon name="shield" size={16} />
              Protected workspace
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              Admin data is served only to authenticated SUPER_ADMIN accounts.
            </p>
          </div>

          <div className="mt-3 px-3 pb-1 text-[10px] text-slate-600">
            Database · tracker_db
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.24em] text-fuchsia-300">
                Control center / {active}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[34px]">
                {pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                A live operational view of your InternHub platform.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Icon name="search" size={17} />
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search records..."
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d20] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-400/50 sm:w-64"
                />
              </div>

              <button
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-fuchsia-400/40 disabled:opacity-50"
              >
                <Icon name="refresh" />
                {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          {loading && !Object.keys(data.overview).length ? (
            <div className="grid min-h-[420px] place-items-center rounded-2xl border border-white/10 bg-[#0d0d20]">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-400/20 border-t-fuchsia-400" />
                <p className="mt-4 text-sm text-slate-400">
                  Loading live platform data…
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {active === "overview" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Metric
                      title="Student accounts"
                      value={overview.student_accounts || 0}
                      detail={`${Number(
                        overview.student_profiles || 0
                      ).toLocaleString("en-IN")} student profiles`}
                      icon="users"
                      tone="violet"
                    />
                    <Metric
                      title="Company accounts"
                      value={overview.company_accounts || 0}
                      detail={`${Number(
                        overview.company_profiles || 0
                      ).toLocaleString("en-IN")} company profiles`}
                      icon="building"
                      tone="cyan"
                    />
                    <Metric
                      title="Opportunities"
                      value={overview.total_opportunities || 0}
                      detail={`${Number(
                        overview.open_opportunities || 0
                      )} currently open`}
                      icon="briefcase"
                      tone="amber"
                    />
                    <Metric
                      title="Applications"
                      value={overview.total_applications || 0}
                      detail={`${Number(
                        overview.total_resumes || 0
                      )} resumes stored`}
                      icon="file"
                      tone="green"
                    />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
                    <Panel
                      title="Platform activity"
                      subtitle="User account registrations by month"
                    >
                      <BarList
                        items={data.analytics.monthly_registrations}
                        labelKey="month"
                        valueKey="total"
                      />
                    </Panel>

                    <Panel
                      title="Application pipeline"
                      subtitle="Applications grouped by current stage"
                    >
                      <BarList
                        items={data.analytics.application_stages}
                        labelKey="stage"
                        valueKey="total"
                      />
                    </Panel>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      title="Pending companies"
                      value={overview.pending_companies || 0}
                      detail="Awaiting admin review"
                      icon="clock"
                      tone="amber"
                    />
                    <Metric
                      title="Approved companies"
                      value={overview.approved_companies || 0}
                      detail="Approved profiles"
                      icon="check"
                      tone="green"
                    />
                    <Metric
                      title="Rejected companies"
                      value={overview.rejected_companies || 0}
                      detail="Rejected profiles"
                      icon="x"
                      tone="rose"
                    />
                    <Metric
                      title="Saved opportunities"
                      value={overview.saved_opportunities || 0}
                      detail="Student bookmarks"
                      icon="briefcase"
                      tone="violet"
                    />
                  </div>

                  <Panel
                    title="Recent applications"
                    subtitle="Latest applications submitted on the platform"
                  >
                    <div className="ih-scroll overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[.15em] text-slate-500">
                          <tr>
                            <th className="px-5 py-3">Candidate</th>
                            <th className="px-5 py-3">Opportunity</th>
                            <th className="px-5 py-3">Company</th>
                            <th className="px-5 py-3">Applied</th>
                            <th className="px-5 py-3">Stage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {data.applications.slice(0, 6).map((row) => (
                            <tr key={row.application_id}>
                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-slate-200">
                                  {row.candidate_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {row.candidate_email}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-300">
                                {row.opportunity_title}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-400">
                                {row.company_name}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-400">
                                {dateLabel(
                                  row.applied_at || row.applied_date
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <Status value={row.current_stage} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!data.applications.length && (
                        <Empty label="applications" />
                      )}
                    </div>
                  </Panel>
                </div>
              )}

              {/* STUDENTS */}
              {active === "students" && (
                <Panel
                  title="Student directory"
                  subtitle={`Showing ${filteredStudents.length} of ${data.students.length} student accounts`}
                >
                  <div className="ih-scroll overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left">
                      <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[.15em] text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Student</th>
                          <th className="px-5 py-4">Academic details</th>
                          <th className="px-5 py-4">College</th>
                          <th className="px-5 py-4">Applications</th>
                          <th className="px-5 py-4">Resumes</th>
                          <th className="px-5 py-4">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredStudents.map((row) => (
                          <tr
                            key={row.user_id}
                            className="hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-200">
                                {row.first_name} {row.last_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.email}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-300">
                                {row.major || "Major not set"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Graduation {row.graduation_year || "—"}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {row.college || "—"}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-200">
                              {Number(row.application_count || 0)}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-200">
                              {Number(row.resume_count || 0)}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {dateLabel(row.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filteredStudents.length && <Empty label="students" />}
                  </div>
                </Panel>
              )}

              {/* COMPANIES */}
              {active === "companies" && (
                <Panel
                  title="Company directory & approvals"
                  subtitle={`Showing ${filteredCompanies.length} of ${data.companies.length} company profiles`}
                  action={
                    <select
                      value={companyFilter}
                      onChange={(event) =>
                        setCompanyFilter(event.target.value)
                      }
                      className="rounded-lg border border-white/10 bg-[#080816] px-3 py-2 text-xs text-slate-200 outline-none focus:border-fuchsia-400/50"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  }
                >
                  <div className="ih-scroll overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[.15em] text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Company</th>
                          <th className="px-5 py-4">Account owner</th>
                          <th className="px-5 py-4">Location</th>
                          <th className="px-5 py-4">Registered</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredCompanies.map((row) => (
                          <tr
                            key={row.company_id}
                            className="hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-200">
                                {row.company_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {row.industry || "Industry not specified"}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-300">
                                {row.user_id
                                  ? `${row.first_name || ""} ${
                                      row.last_name || ""
                                    }`.trim() || "Linked account"
                                  : "No linked account"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.email || "—"}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {row.location || "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {dateLabel(row.registered_at)}
                            </td>
                            <td className="px-5 py-4">
                              <Status value={row.approval_status} />
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                {row.approval_status !== "APPROVED" &&
                                  row.user_id && (
                                    <button
                                      disabled={
                                        busyId === Number(row.company_id)
                                      }
                                      onClick={() =>
                                        void updateApproval(
                                          Number(row.company_id),
                                          "APPROVED"
                                        )
                                      }
                                      className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
                                    >
                                      Approve
                                    </button>
                                  )}
                                {row.approval_status !== "REJECTED" &&
                                  row.user_id && (
                                    <button
                                      disabled={
                                        busyId === Number(row.company_id)
                                      }
                                      onClick={() =>
                                        void updateApproval(
                                          Number(row.company_id),
                                          "REJECTED"
                                        )
                                      }
                                      className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/20 disabled:opacity-40"
                                    >
                                      Reject
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filteredCompanies.length && <Empty label="companies" />}
                  </div>
                </Panel>
              )}

              {/* INTERNSHIPS */}
              {active === "internships" && (
                <Panel
                  title="Opportunity inventory"
                  subtitle={`Showing ${filteredOpportunities.length} of ${data.opportunities.length} opportunities`}
                >
                  <div className="ih-scroll overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[.15em] text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Opportunity</th>
                          <th className="px-5 py-4">Company</th>
                          <th className="px-5 py-4">Type</th>
                          <th className="px-5 py-4">Stipend</th>
                          <th className="px-5 py-4">Deadline</th>
                          <th className="px-5 py-4">Applications</th>
                          <th className="px-5 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredOpportunities.map((row) => (
                          <tr
                            key={row.opportunity_id}
                            className="hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-200">
                                {row.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ID #{row.opportunity_id}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-300">
                                {row.company_name}
                              </p>
                              <div className="mt-1">
                                <Status value={row.approval_status} />
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {row.opportunity_type}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-300">
                              ₹
                              {Number(row.stipend || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {dateLabel(row.deadline)}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-200">
                              {Number(row.application_count || 0)}
                            </td>
                            <td className="px-5 py-4">
                              <Status value={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filteredOpportunities.length && (
                      <Empty label="opportunities" />
                    )}
                  </div>
                </Panel>
              )}

              {/* APPLICATIONS */}
              {active === "applications" && (
                <Panel
                  title="Application monitoring"
                  subtitle={`Showing ${filteredApplications.length} of ${data.applications.length} applications`}
                  action={
                    <select
                      value={applicationFilter}
                      onChange={(event) =>
                        setApplicationFilter(event.target.value)
                      }
                      className="rounded-lg border border-white/10 bg-[#080816] px-3 py-2 text-xs text-slate-200 outline-none focus:border-fuchsia-400/50"
                    >
                      <option value="ALL">All stages</option>
                      {[
                        "Applied",
                        "Assessment",
                        "Interview",
                        "Offer",
                        "Rejected",
                      ].map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  }
                >
                  <div className="ih-scroll overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left">
                      <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[.15em] text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Candidate</th>
                          <th className="px-5 py-4">Opportunity</th>
                          <th className="px-5 py-4">Company</th>
                          <th className="px-5 py-4">Applied on</th>
                          <th className="px-5 py-4">Match score</th>
                          <th className="px-5 py-4">Stage</th>
                          <th className="px-5 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredApplications.map((row) => (
                          <tr
                            key={row.application_id}
                            className="hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-200">
                                {row.candidate_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {row.candidate_email}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-300">
                              {row.opportunity_title}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {row.company_name}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {dateLabel(
                                row.applied_at || row.applied_date
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-300">
                              {row.match_score === null ||
                              row.match_score === undefined
                                ? "—"
                                : `${Number(row.match_score).toFixed(1)}%`}
                            </td>
                            <td className="px-5 py-4">
                              <Status value={row.current_stage} />
                            </td>
                            <td className="px-5 py-4">
                              <Status value={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filteredApplications.length && (
                      <Empty label="applications" />
                    )}
                  </div>
                </Panel>
              )}

              {/* PLATFORM ANALYTICS */}
              {active === "analytics" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      title="Students"
                      value={overview.student_accounts || 0}
                      detail="Registered accounts"
                      icon="users"
                    />
                    <Metric
                      title="Companies"
                      value={overview.company_accounts || 0}
                      detail="Registered company accounts"
                      icon="building"
                      tone="cyan"
                    />
                    <Metric
                      title="Applications"
                      value={overview.total_applications || 0}
                      detail="Submitted applications"
                      icon="file"
                      tone="green"
                    />
                    <Metric
                      title="Open opportunities"
                      value={overview.open_opportunities || 0}
                      detail="Currently open listings"
                      icon="briefcase"
                      tone="amber"
                    />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <Panel
                      title="Opportunity mix"
                      subtitle="Listings by opportunity type"
                    >
                      <BarList
                        items={data.analytics.opportunity_types}
                        labelKey="type"
                        valueKey="total"
                      />
                    </Panel>

                    <Panel
                      title="Company industries"
                      subtitle="Company profiles grouped by industry"
                    >
                      <BarList
                        items={data.analytics.company_industries}
                        labelKey="industry"
                        valueKey="total"
                      />
                    </Panel>

                    <Panel
                      title="Application stages"
                      subtitle="Current application pipeline distribution"
                    >
                      <BarList
                        items={data.analytics.application_stages}
                        labelKey="stage"
                        valueKey="total"
                      />
                    </Panel>

                    <Panel
                      title="Monthly registrations"
                      subtitle="New user accounts by month"
                    >
                      <BarList
                        items={data.analytics.monthly_registrations}
                        labelKey="month"
                        valueKey="total"
                      />
                    </Panel>
                  </div>

                  <p className="text-xs text-slate-600">
                    Analytics are calculated from the current database records.
                    Monthly registrations are based on users.created_at.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-600">
            InternHub · Super Admin Console · Live database view
          </p>
        </section>
      </div>
    </main>
  );
}
