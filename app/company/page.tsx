
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Company = {
  company_id: number;
  name: string;
  industry: string | null;
  website: string | null;
  location: string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
};

type Stats = {
  total_postings: number | string;
  active_postings: number | string;
  total_applications: number | string;
  shortlisted: number | string;
  hired: number | string;
};

type Opportunity = {
  opportunity_id: number;
  title: string;
  opportunity_type: string;
  description: string;
  required_skills: string | null;
  deadline: string | null;
  status: "Open" | "Closed";
  stipend: number | string;
  created_at: string;
};

type Application = {
  application_id: number;
  student_id: number | null;
  candidate_name: string;
  candidate_email: string;
  match_score: number | string | null;
  status: string;
  current_stage: string;
  applied_at: string | null;
  applied_date: string | null;
  extracted_skills?: string | null;

  opportunity_id: number;
  opportunity_title: string;
  opportunity_type: string;
  opportunity_description?: string | null;
  required_skills?: string | null;
  deadline?: string | null;
  stipend?: number | string | null;

  first_name?: string | null;
  last_name?: string | null;
  student_email?: string | null;

  srn?: string | null;
  major?: string | null;
  graduation_year?: number | string | null;
  college?: string | null;
  phone?: string | null;

  portfolio_summary?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;

  degree?: string | null;
  cgpa?: number | string | null;
  tenth_percentage?: number | string | null;
  twelfth_percentage?: number | string | null;
  diploma_percentage?: number | string | null;
  active_backlogs?: number | string | null;
  current_semester?: number | string | null;

  skills?: string | null;
  matched_skills?: string | string[] | null;
  missing_skills?: string | string[] | null;
  recommendation_generated_at?: string | null;
};

type DashboardData = {
  success: boolean;
  company: Company;
  stats: Stats;
  opportunities: Opportunity[];
  recentApplications: Application[];
  applications?: Application[];
  applicationTrend: {
    day: string;
    applications: number;
  }[];
  applicationsByType: {
    role: string;
    applications: number;
  }[];
};

type Tab =
  | "Dashboard"
  | "Post Internships"
  | "Applications"
  | "Candidates"
  | "Analytics"
  | "Company Profile"
  | "Settings";

const navigation: { label: Tab; icon: string }[] = [
  { label: "Dashboard", icon: "▦" },
  { label: "Post Internships", icon: "🚀" },
  { label: "Applications", icon: "▱" },
  { label: "Candidates", icon: "♙" },
  { label: "Analytics", icon: "▥" },
  { label: "Company Profile", icon: "▣" },
  { label: "Settings", icon: "⚙" },
];

const money = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const initials = (name: string) =>
  String(name || "Candidate")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";

/* Safely convert JSON, arrays and comma-separated values into lists. */
function parseSkills(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;

          return String(
            record.skill_name ??
            record.skill ??
            record.name ??
            ""
          );
        }

        return String(item);
      })
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parseSkills(parsed);
    }
  } catch {
    // The value may be an ordinary comma-separated string.
  }

  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayValue(
  value: string | number | null | undefined,
  suffix = ""
) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return `${value}${suffix}`;
}

export default function CompanyPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [applicationFilter, setApplicationFilter] = useState("All");
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const emptyForm = {
    title: "",
    opportunity_type: "Internship",
    description: "",
    required_skills: "",
    deadline: "",
    stipend: "",
    min_cgpa: "",
    min_tenth_percentage: "",
    min_twelfth_percentage: "",
    min_diploma_percentage: "",
    max_active_backlogs: "",
    min_semester: "",
    max_semester: "",
    eligible_degrees: "",
    eligible_branches: "",
    eligible_graduation_years: "",
    other_requirements: "",
  };

  const [form, setForm] = useState(emptyForm);

  const parseList = (value: string) =>
    value.split(",").map((item) => item.trim()).filter(Boolean);

  const optionalNumber = (value: string) =>
    value.trim() === "" ? null : Number(value);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/company", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load company dashboard."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const applications =
    data?.applications ?? data?.recentApplications ?? [];

  const recentApplications =
    data?.recentApplications ?? applications.slice(0, 12);

  const opportunities = data?.opportunities ?? [];

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return applications.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.candidate_name,
          item.candidate_email,
          item.opportunity_title,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );

      const matchesStatus =
        applicationFilter === "All" ||
        item.status === applicationFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, applicationFilter]);

  const postInternship = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          opportunity_type: form.opportunity_type,
          description: form.description,
          required_skills: form.required_skills,
          deadline: form.deadline || null,
          stipend: form.stipend === "" ? 0 : Number(form.stipend),
          eligibility: {
            min_cgpa: optionalNumber(form.min_cgpa),
            min_tenth_percentage: optionalNumber(
              form.min_tenth_percentage
            ),
            min_twelfth_percentage: optionalNumber(
              form.min_twelfth_percentage
            ),
            min_diploma_percentage: optionalNumber(
              form.min_diploma_percentage
            ),
            max_active_backlogs: optionalNumber(
              form.max_active_backlogs
            ),
            min_semester: optionalNumber(form.min_semester),
            max_semester: optionalNumber(form.max_semester),
            eligible_degrees: parseList(form.eligible_degrees),
            eligible_branches: parseList(form.eligible_branches),
            eligible_graduation_years: parseList(
              form.eligible_graduation_years
            )
              .map(Number)
              .filter(Number.isInteger),
            other_requirements:
              form.other_requirements.trim() || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to post internship."
        );
      }

      setNotice("Internship posted successfully.");
      setForm(emptyForm);
      setShowPostForm(false);
      setActiveTab("Post Internships");
      await loadDashboard();
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to post internship."
      );
    } finally {
      setBusy(false);
    }
  };

  const updateApplication = async (
    applicationId: number,
    status: string
  ) => {
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update_application",
          application_id: applicationId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update application."
        );
      }

      setNotice(result.message);
      await loadDashboard();

      setSelectedApplication((current) =>
        current?.application_id === applicationId
          ? {
              ...current,
              status,
              current_stage:
                status === "Interview"
                  ? "Interview"
                  : status === "Selected"
                    ? "Offer"
                    : status === "Rejected"
                      ? "Rejected"
                      : current.current_stage,
            }
          : current
      );
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to update application."
      );
    } finally {
      setBusy(false);
    }
  };

  const updateOpportunity = async (
    opportunityId: number,
    status: "Open" | "Closed"
  ) => {
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update_opportunity",
          opportunity_id: opportunityId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update internship."
        );
      }

      setNotice(result.message);
      await loadDashboard();
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to update internship."
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    router.replace("/login");
    router.refresh();
  };

  const number = (value: number | string | undefined) =>
    Number(value ?? 0).toLocaleString("en-IN");

  const stats = data?.stats;
  const trend = data?.applicationTrend ?? [];

  const maxTrend = Math.max(
    1,
    ...trend.map((item) => Number(item.applications))
  );

  const totalByType = (
    data?.applicationsByType ?? []
  ).reduce(
    (sum, item) => sum + Number(item.applications),
    0
  );

  /* =====================================================
     APPLICATION TABLE
  ===================================================== */

  const renderApplicationsTable = (items: Application[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-[#17172f] text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Match</th>
            <th className="px-4 py-3">Applied</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Update</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.application_id}
              className="border-t border-white/[0.06] hover:bg-white/[0.025]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 font-semibold text-fuchsia-200">
                    {initials(
                      item.candidate_name || `Candidate ${index + 1}`
                    )}
                  </span>

                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedApplication(item)}
                      className="block text-left font-semibold text-white hover:text-fuchsia-300"
                    >
                      {item.candidate_name || "Candidate"}
                    </button>

                    <span className="text-xs text-slate-500">
                      {item.candidate_email}
                    </span>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-slate-300">
                {item.opportunity_title}
              </td>

              <td className="px-4 py-3">
                {item.match_score == null ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                    N/A
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-300">
                    {Number(item.match_score).toFixed(0)}%
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-slate-400">
                {dateLabel(item.applied_at || item.applied_date)}
              </td>

              <td className="px-4 py-3">
                <StatusPill status={item.status || item.current_stage} />
              </td>

              <td className="px-4 py-3">
                <select
                  disabled={busy}
                  value={item.status || "Applied"}
                  onChange={(event) =>
                    updateApplication(
                      item.application_id,
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-white/10 bg-[#111326] px-2 py-2 text-xs text-slate-200 outline-none focus:border-fuchsia-400"
                >
                  {[
                    "Applied",
                    "Under Review",
                    "Shortlisted",
                    "Interview",
                    "Selected",
                    "Rejected",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}

          {!items.length && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-12 text-center text-slate-500"
              >
                No applications match this view yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <main className="min-h-screen bg-[#080817] text-white selection:bg-fuchsia-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-700/10 blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-violet-400/20 bg-[#080817]/95 px-5 backdrop-blur-2xl lg:px-9">
        <div className="flex items-center gap-4">
          <BrandMark />
          <span className="text-2xl font-extrabold tracking-tight">
            Intern<span className="text-fuchsia-400">Hub</span>
          </span>
          <span className="hidden rounded-full border border-fuchsia-500/40 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-fuchsia-200 sm:inline-flex">
            Company Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">
            Company account
          </span>

          <button
            onClick={() => setActiveTab("Company Profile")}
            className="grid h-10 w-10 place-items-center rounded-full border border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500 to-violet-700 font-bold"
          >
            {initials(data?.company?.name || "Company")}
          </button>

          <button
            onClick={logout}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:border-fuchsia-400/50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1900px]">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-[260px] shrink-0 border-r border-violet-400/15 bg-[#090a1d]/85 p-4 lg:block">
          <div className="space-y-2">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveTab(item.label);
                  setNotice("");
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeTab === item.label
                    ? "border border-fuchsia-400/50 bg-gradient-to-r from-purple-700/50 to-fuchsia-700/20 text-white"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 text-lg text-fuchsia-200">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Signed in as
            </p>
            <p className="mt-2 truncate font-semibold">
              {data?.company?.name || "Company"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data?.company?.industry || "Company account"}
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs ${
                  activeTab === item.label
                    ? "border-fuchsia-400 bg-purple-500/20 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="grid min-h-[55vh] place-items-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-400/20 border-t-fuchsia-400" />
                <p className="mt-4 text-sm text-slate-400">
                  Loading your company workspace…
                </p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
              <p className="text-lg font-semibold text-rose-200">
                Unable to open Company Portal
              </p>
              <p className="mt-2 text-sm text-rose-100/70">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-5 rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && data && (
            <>
              {notice && (
                <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">
                  <span>{notice}</span>
                  <button onClick={() => setNotice("")}>×</button>
                </div>
              )}

              {data.company.approval_status !== "APPROVED" && (
                <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="font-semibold">
                    Company approval pending
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Your company profile is awaiting Super Admin approval.
                  </p>
                </div>
              )}

              <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                  <p className="text-sm font-medium text-fuchsia-300">
                    COMPANY WORKSPACE
                  </p>
                  <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                    Welcome, {data.company.name}
                    <span className="ml-1 text-fuchsia-300">✦</span>
                  </h1>
                  <p className="mt-2 text-sm text-slate-400">
                    Manage your internship postings, review applications,
                    and find the best talent.
                  </p>
                </div>

                <button
                  onClick={loadDashboard}
                  className="w-fit rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 hover:border-fuchsia-400/50"
                >
                  ↻ Refresh data
                </button>
              </div>

              {/* DASHBOARD */}

              {activeTab === "Dashboard" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                    <MetricCard
                      value={number(stats?.active_postings)}
                      label="Active Postings"
                    />
                    <MetricCard
                      value={number(stats?.total_applications)}
                      label="Total Applications"
                    />
                    <MetricCard
                      value={number(stats?.shortlisted)}
                      label="Shortlisted"
                    />
                    <MetricCard
                      value={number(stats?.hired)}
                      label="Hired / Selected"
                    />
                  </div>

                  <Panel title="Recent Applications">
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={() => setActiveTab("Applications")}
                        className="text-sm font-semibold text-fuchsia-300"
                      >
                        View all →
                      </button>
                    </div>
                    {renderApplicationsTable(
                      recentApplications.slice(0, 5)
                    )}
                  </Panel>
                </div>
              )}

              {/* POST INTERNSHIPS */}

              {activeTab === "Post Internships" && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Internship Postings
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Manage opportunities published by {data.company.name}.
                      </p>
                    </div>

                    <button
                      disabled={data.company.approval_status !== "APPROVED"}
                      onClick={() => setShowPostForm((v) => !v)}
                      className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold disabled:opacity-40"
                    >
                      + Create Posting
                    </button>
                  </div>

                  {showPostForm && (
                    <Panel title="Create a new opportunity">
                      <form
                        onSubmit={postInternship}
                        className="grid gap-4 md:grid-cols-2"
                      >
                        <Field label="Role title">
                          <input
                            required
                            maxLength={100}
                            value={form.title}
                            onChange={(e) =>
                              setForm({ ...form, title: e.target.value })
                            }
                            className="field"
                          />
                        </Field>

                        <Field label="Opportunity type">
                          <select
                            value={form.opportunity_type}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                opportunity_type: e.target.value,
                              })
                            }
                            className="field"
                          >
                            <option>Internship</option>
                            <option>Project</option>
                            <option>Full-Time</option>
                          </select>
                        </Field>

                        <Field label="Stipend (INR)">
                          <input
                            type="number"
                            min="0"
                            value={form.stipend}
                            onChange={(e) =>
                              setForm({ ...form, stipend: e.target.value })
                            }
                            className="field"
                          />
                        </Field>

                        <Field label="Application deadline">
                          <input
                            type="date"
                            value={form.deadline}
                            onChange={(e) =>
                              setForm({ ...form, deadline: e.target.value })
                            }
                            className="field"
                          />
                        </Field>

                        <div className="md:col-span-2">
                          <Field label="Required skills">
                            <textarea
                              required
                              rows={2}
                              value={form.required_skills}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  required_skills: e.target.value,
                                })
                              }
                              className="field"
                              placeholder="Python, SQL, Machine Learning"
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-2">
                          <Field label="Description">
                            <textarea
                              required
                              rows={4}
                              value={form.description}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  description: e.target.value,
                                })
                              }
                              className="field"
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-2 rounded-2xl border border-fuchsia-400/20 bg-purple-500/[0.06] p-5">
                          <h3 className="mb-4 font-bold">
                            Academic Eligibility Criteria
                          </h3>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(
                              [
                                ["min_cgpa", "Minimum CGPA"],
                                ["max_active_backlogs", "Maximum active backlogs"],
                                ["min_tenth_percentage", "Minimum 10th percentage"],
                                ["min_twelfth_percentage", "Minimum 12th percentage"],
                                ["min_diploma_percentage", "Minimum diploma percentage"],
                                ["min_semester", "Minimum semester"],
                                ["max_semester", "Maximum semester"],
                                ["eligible_degrees", "Eligible degrees"],
                                ["eligible_branches", "Eligible branches"],
                                ["eligible_graduation_years", "Graduation years"],
                              ] as const
                            ).map(([key, label]) => (
                              <Field key={key} label={label}>
                                <input
                                  value={form[key]}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      [key]: e.target.value,
                                    })
                                  }
                                  className="field"
                                />
                              </Field>
                            ))}

                            <div className="sm:col-span-2 lg:col-span-3">
                              <Field label="Other requirements">
                                <textarea
                                  rows={2}
                                  value={form.other_requirements}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      other_requirements: e.target.value,
                                    })
                                  }
                                  className="field"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 md:col-span-2">
                          <button
                            disabled={busy}
                            className="rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                          >
                            {busy ? "Publishing..." : "Publish Opportunity"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowPostForm(false)}
                            className="rounded-xl border border-white/10 px-5 py-3 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </Panel>
                  )}

                  <Panel title={`Your postings (${opportunities.length})`}>
                    <div className="space-y-3">
                      {opportunities.map((item) => (
                        <div
                          key={item.opportunity_id}
                          className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:flex-row md:items-center"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              <StatusPill status={item.status} />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.opportunity_type} · {money(item.stipend)} ·
                              Deadline: {dateLabel(item.deadline)}
                            </p>
                            <p className="mt-2 text-sm text-slate-400">
                              {item.description}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              Skills: {item.required_skills || "Not specified"}
                            </p>
                          </div>

                          <button
                            disabled={busy}
                            onClick={() =>
                              updateOpportunity(
                                item.opportunity_id,
                                item.status === "Open" ? "Closed" : "Open"
                              )
                            }
                            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold"
                          >
                            {item.status === "Open"
                              ? "Close posting"
                              : "Reopen posting"}
                          </button>
                        </div>
                      ))}

                      {!opportunities.length && (
                        <EmptyState text="No opportunities posted yet." />
                      )}
                    </div>
                  </Panel>
                </div>
              )}

              {/* APPLICATIONS */}

              {activeTab === "Applications" && (
                <Panel title="Applications">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search candidate, email or role..."
                      className="field flex-1"
                    />

                    <select
                      value={applicationFilter}
                      onChange={(e) => setApplicationFilter(e.target.value)}
                      className="field md:max-w-52"
                    >
                      {[
                        "All",
                        "Applied",
                        "Under Review",
                        "Shortlisted",
                        "Interview",
                        "Selected",
                        "Rejected",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>

                  {renderApplicationsTable(filteredApplications)}
                </Panel>
              )}

              {/* CANDIDATES */}

              {activeTab === "Candidates" && (
                <Panel title="Candidates">
                  <div className="grid gap-3 md:grid-cols-2">
                    {applications.map((item) => (
                      <button
                        key={item.application_id}
                        onClick={() => setSelectedApplication(item)}
                        className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left hover:border-fuchsia-400/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-purple-500/20 font-bold text-fuchsia-200">
                            {initials(item.candidate_name)}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {item.candidate_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {item.candidate_email}
                            </p>
                          </div>

                          <div className="ml-auto">
                            <StatusPill status={item.status} />
                          </div>
                        </div>

                        <div className="mt-4 flex justify-between gap-3 text-xs text-slate-400">
                          <span>{item.opportunity_title}</span>
                          <span>
                            {item.match_score == null
                              ? "Match N/A"
                              : `${Number(item.match_score).toFixed(0)}% match`}
                          </span>
                        </div>
                      </button>
                    ))}

                    {!applications.length && (
                      <EmptyState text="No candidates have applied yet." />
                    )}
                  </div>
                </Panel>
              )}

              {/* ANALYTICS */}

              {activeTab === "Analytics" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                      value={number(stats?.total_postings)}
                      label="All Postings"
                    />
                    <MetricCard
                      value={number(stats?.total_applications)}
                      label="Applications Received"
                    />
                    <MetricCard
                      value={number(stats?.shortlisted)}
                      label="Shortlisted"
                    />
                  </div>

                  <Panel title="Application activity">
                    <p className="mb-4 text-sm text-slate-400">
                      Daily applications received over the last 30 days.
                    </p>

                    {trend.length ? (
                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                        {trend.map((item) => (
                          <div
                            key={item.day}
                            title={`${dateLabel(item.day)}: ${item.applications}`}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="flex h-36 w-full items-end rounded-lg bg-white/[0.035] p-1">
                              <div
                                className="w-full rounded-md bg-gradient-to-t from-purple-700 to-fuchsia-400"
                                style={{
                                  height: `${Math.max(
                                    4,
                                    (Number(item.applications) / maxTrend) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.day).getDate()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState text="No application activity yet." />
                    )}
                  </Panel>

                  <Panel title="Applications by opportunity type">
                    <div className="space-y-4">
                      {(data.applicationsByType ?? []).map((item) => (
                        <div key={item.role}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{item.role}</span>
                            <span className="text-slate-400">
                              {item.applications}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
                              style={{
                                width: `${
                                  totalByType
                                    ? (Number(item.applications) / totalByType) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              )}

              {/* COMPANY PROFILE */}

              {activeTab === "Company Profile" && (
                <Panel title="Company Profile">
                  <div className="flex items-center gap-5">
                    <div className="grid h-20 w-20 place-items-center rounded-2xl border border-fuchsia-400/40 bg-purple-500/15 text-3xl font-bold text-fuchsia-200">
                      {initials(data.company.name)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {data.company.name}
                      </h2>
                      <p className="text-sm text-slate-400">
                        {data.company.industry || "Industry not provided"}
                      </p>
                      <StatusPill status={data.company.approval_status} />
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <ProfileItem label="Company name" value={data.company.name} />
                    <ProfileItem label="Industry" value={data.company.industry} />
                    <ProfileItem label="Location" value={data.company.location} />
                    <ProfileItem label="Website" value={data.company.website} />
                    <ProfileItem
                      label="Company ID"
                      value={String(data.company.company_id)}
                    />
                    <ProfileItem
                      label="Approval status"
                      value={data.company.approval_status}
                    />
                  </div>
                </Panel>
              )}

              {/* SETTINGS */}

              {activeTab === "Settings" && (
                <Panel title="Account Settings">
                  <div className="max-w-2xl space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="font-semibold">Company account</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Signed in as {data.company.name}.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="font-semibold">Account approval</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Current status: {data.company.approval_status}
                      </p>
                    </div>

                    <button
                      onClick={logout}
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200"
                    >
                      Sign out
                    </button>
                  </div>
                </Panel>
              )}
            </>
          )}
        </section>
      </div>

      {/* =====================================================
          APPLICANT DETAILS MODAL
      ===================================================== */}

      {selectedApplication && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-violet-400/30 bg-[#101329] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#101329]/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <h2 className="text-lg font-bold">Applicant Details</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Application #{selectedApplication.application_id}
                </p>
              </div>

              <button
                onClick={() => setSelectedApplication(null)}
                className="rounded-lg border border-white/10 px-3 py-2 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* PROFILE */}

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-500/20 text-lg font-bold text-fuchsia-200">
                    {initials(selectedApplication.candidate_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">
                      {selectedApplication.candidate_name}
                    </h3>
                    <p className="break-all text-xs text-slate-400">
                      {selectedApplication.student_email ||
                        selectedApplication.candidate_email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedApplication.major || "Branch not provided"}
                      {selectedApplication.college
                        ? ` · ${selectedApplication.college}`
                        : ""}
                    </p>
                  </div>

                  <StatusPill status={selectedApplication.status} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileItem
                    label="SRN"
                    value={selectedApplication.srn}
                  />
                  <ProfileItem
                    label="Phone"
                    value={selectedApplication.phone}
                  />
                  <ProfileItem
                    label="Graduation Year"
                    value={displayValue(
                      selectedApplication.graduation_year
                    )}
                  />
                  <ProfileItem
                    label="College"
                    value={selectedApplication.college}
                  />
                  <ProfileItem
                    label="Branch / Major"
                    value={selectedApplication.major}
                  />
                  <ProfileItem
                    label="Student ID"
                    value={displayValue(selectedApplication.student_id)}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedApplication.portfolio_url && (
                    <a
                      href={selectedApplication.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-fuchsia-400/30 px-3 py-2 text-xs text-fuchsia-200 hover:bg-fuchsia-500/10"
                    >
                      Portfolio ↗
                    </a>
                  )}

                  {selectedApplication.linkedin_url && (
                    <a
                      href={selectedApplication.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-fuchsia-400/30 px-3 py-2 text-xs text-fuchsia-200 hover:bg-fuchsia-500/10"
                    >
                      LinkedIn ↗
                    </a>
                  )}

                  {selectedApplication.github_url && (
                    <a
                      href={selectedApplication.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-fuchsia-400/30 px-3 py-2 text-xs text-fuchsia-200 hover:bg-fuchsia-500/10"
                    >
                      GitHub ↗
                    </a>
                  )}

                  <a
                    href={`mailto:${encodeURIComponent(
                      selectedApplication.student_email ||
                        selectedApplication.candidate_email
                    )}`}
                    className="rounded-lg border border-fuchsia-400/30 px-3 py-2 text-xs text-fuchsia-200 hover:bg-fuchsia-500/10"
                  >
                    Contact candidate ↗
                  </a>
                </div>
              </section>

              {/* ACADEMICS */}

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <h3 className="mb-4 font-bold">Academic Information</h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileItem
                    label="Degree"
                    value={selectedApplication.degree}
                  />
                  <ProfileItem
                    label="CGPA"
                    value={displayValue(selectedApplication.cgpa)}
                  />
                  <ProfileItem
                    label="Current Semester"
                    value={displayValue(
                      selectedApplication.current_semester
                    )}
                  />
                  <ProfileItem
                    label="10th Percentage"
                    value={displayValue(
                      selectedApplication.tenth_percentage,
                      "%"
                    )}
                  />
                  <ProfileItem
                    label="12th Percentage"
                    value={displayValue(
                      selectedApplication.twelfth_percentage,
                      "%"
                    )}
                  />
                  <ProfileItem
                    label="Diploma Percentage"
                    value={displayValue(
                      selectedApplication.diploma_percentage,
                      "%"
                    )}
                  />
                  <ProfileItem
                    label="Active Backlogs"
                    value={displayValue(
                      selectedApplication.active_backlogs
                    )}
                  />
                </div>
              </section>

              {/* RECOMMENDATION SCORE */}

              <section className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.05] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      Recommendation Engine Match
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Match score for this specific opportunity
                    </p>
                  </div>

                  <span className="text-3xl font-extrabold text-emerald-300">
                    {selectedApplication.match_score == null
                      ? "N/A"
                      : `${Number(
                          selectedApplication.match_score
                        ).toFixed(1)}%`}
                  </span>
                </div>

                {selectedApplication.match_score != null && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(selectedApplication.match_score)
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  {selectedApplication.recommendation_generated_at
                    ? `Recommendation generated: ${dateLabel(
                        selectedApplication.recommendation_generated_at
                      )}`
                    : "No recommendation timestamp is available."}
                </p>
              </section>

              {/* MATCHED AND MISSING SKILLS */}

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.04] p-4">
                  <h3 className="font-bold text-emerald-300">
                    Matched Skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseSkills(
                      selectedApplication.matched_skills
                    ).map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {!parseSkills(selectedApplication.matched_skills).length && (
                    <p className="mt-3 text-xs text-slate-500">
                      No matched-skill breakdown is available.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-rose-400/25 bg-rose-500/[0.04] p-4">
                  <h3 className="font-bold text-rose-300">
                    Missing Skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseSkills(
                      selectedApplication.missing_skills
                    ).map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {!parseSkills(selectedApplication.missing_skills).length && (
                    <p className="mt-3 text-xs text-slate-500">
                      No missing-skill breakdown is available.
                    </p>
                  )}
                </section>
              </div>

              {/* CANDIDATE SKILLS */}

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <h3 className="font-bold">Candidate Skills</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {parseSkills(selectedApplication.skills).map(
                    (skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>

                {!parseSkills(selectedApplication.skills).length && (
                  <p className="mt-3 text-xs text-slate-500">
                    No candidate skills are available.
                  </p>
                )}

                {selectedApplication.extracted_skills && (
                  <>
                    <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Skills extracted from application
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parseSkills(
                        selectedApplication.extracted_skills
                      ).map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* PORTFOLIO SUMMARY */}

              {selectedApplication.portfolio_summary && (
                <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <h3 className="font-bold">Portfolio Summary</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {selectedApplication.portfolio_summary}
                  </p>
                </section>
              )}

              {/* JOB INFORMATION */}

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <h3 className="font-bold">Applied Opportunity</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ProfileItem
                    label="Position"
                    value={selectedApplication.opportunity_title}
                  />
                  <ProfileItem
                    label="Opportunity Type"
                    value={selectedApplication.opportunity_type}
                  />
                  <ProfileItem
                    label="Stipend"
                    value={
                      selectedApplication.stipend == null
                        ? "Not provided"
                        : money(selectedApplication.stipend)
                    }
                  />
                  <ProfileItem
                    label="Deadline"
                    value={dateLabel(selectedApplication.deadline)}
                  />
                  <ProfileItem
                    label="Applied On"
                    value={dateLabel(
                      selectedApplication.applied_at ||
                        selectedApplication.applied_date
                    )}
                  />
                  <ProfileItem
                    label="Application Status"
                    value={selectedApplication.status}
                  />
                </div>

                <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-slate-500">
                  Required skills
                </p>

                <div className="flex flex-wrap gap-2">
                  {parseSkills(
                    selectedApplication.required_skills
                  ).map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {selectedApplication.opportunity_description ||
                    "No job description provided."}
                </p>
              </section>

              {/* STATUS UPDATE */}

              <section className="border-t border-white/10 pt-4">
                <h3 className="mb-3 font-bold">
                  Update Application Status
                </h3>

                <div className="flex flex-wrap gap-2">
                  {[
                    "Under Review",
                    "Shortlisted",
                    "Interview",
                    "Selected",
                    "Rejected",
                  ].map((status) => (
                    <button
                      key={status}
                      disabled={busy}
                      onClick={() =>
                        updateApplication(
                          selectedApplication.application_id,
                          status
                        )
                      }
                      className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20 disabled:opacity-50"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: #101226;
          padding: 11px 13px;
          color: #f8fafc;
          outline: none;
          font-size: 14px;
        }

        .field:focus {
          border-color: rgba(217, 70, 239, 0.75);
          box-shadow: 0 0 0 3px rgba(217, 70, 239, 0.1);
        }

        .field::placeholder {
          color: #64748b;
        }

        .field option {
          background: #101226;
          color: #fff;
        }

        textarea.field {
          resize: vertical;
        }
      `}</style>
    </main>
  );
}

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

function BrandMark() {
  return (
    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-fuchsia-400/70 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10">
      <svg
        viewBox="0 0 48 32"
        className="h-7 w-9"
        fill="none"
        aria-label="InternHub logo"
      >
        <path
          d="M24 16C18 7 13 4 8.5 7.5 3 11.8 4.5 22 11 24.5c4.8 1.8 8.2-1.8 13-8.5 4.8-6.7 8.2-10.3 13-8.5 6.5 2.5 8 12.7 2.5 17-4.5 3.5-9.5.5-15.5-8.5Z"
          stroke="#D946EF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-violet-400/25 bg-gradient-to-br from-[#15152f]/95 via-[#101329]/95 to-[#090b1c]/95 shadow-[0_18px_55px_rgba(0,0,0,.24)]">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[22px] border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/15 via-purple-500/[0.08] to-[#111329] p-5">
      <p className="text-3xl font-extrabold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-200">
        {label}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "Applied").toLowerCase();

  const style = [
    "shortlisted",
    "selected",
    "hired",
    "approved",
    "open",
    "offer",
  ].includes(normalized)
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
    : ["rejected", "closed"].includes(normalized)
      ? "bg-rose-500/15 text-rose-300 border-rose-400/20"
      : "bg-violet-500/15 text-violet-200 border-violet-400/20";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-200">
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : value}
      </p>
    </div>
  );
}
