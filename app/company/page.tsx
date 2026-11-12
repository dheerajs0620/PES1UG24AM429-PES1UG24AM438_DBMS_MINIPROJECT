"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
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
  opportunity_type: "Internship" | "Project" | "Full-Time";
  description: string;
  required_skills: string | null;
  deadline: string | null;
  status: "Open" | "Closed";
  stipend: number | string;
  created_at: string;
};

type Application = {
  application_id: number;
  candidate_name: string;
  candidate_email: string;
  match_score: number | string | null;
  status: string;
  current_stage: string;
  applied_at: string | null;
  applied_date: string | null;
  opportunity_title: string;
  opportunity_type: string;
};

type DashboardData = {
  success: boolean;
  company: Company;
  stats: Stats;
  opportunities: Opportunity[];
  recentApplications: Application[];
  applications?: Application[];
  applicationTrend: { day: string; applications: number }[];
  applicationsByType: { role: string; applications: number }[];
};

type Tab = "Dashboard" | "Post Internships" | "Applications" | "Candidates" | "Analytics" | "Company Profile" | "Settings";

const navigation: { label: Tab; icon: IconName }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Post Internships", icon: "rocket" },
  { label: "Applications", icon: "layers" },
  { label: "Candidates", icon: "users" },
  { label: "Analytics", icon: "analytics" },
  { label: "Company Profile", icon: "building" },
  { label: "Settings", icon: "settings" }
];

const money = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);
};

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "C";

export default function CompanyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("30");
  const [applicationFilter, setApplicationFilter] = useState("All");
  const [showPostForm, setShowPostForm] = useState(false);
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
    other_requirements: ""
  };

  const [form, setForm] = useState(emptyForm);

  const parseList = (value: string) =>
    value.split(",").map(item => item.trim()).filter(Boolean);

  const optionalNumber = (value: string) =>
    value.trim() === "" ? null : Number(value);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/company", { credentials: "include", cache: "no-store" });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load company dashboard.");
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // The API returns the complete company-scoped application list for the
  // Applications and Candidates tabs. Keep a fallback for older API responses.
  const applications = data?.applications ?? data?.recentApplications ?? [];
  const recentApplications = data?.recentApplications ?? applications.slice(0, 12);
  const opportunities = data?.opportunities ?? [];

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter(item => {
      const matchesSearch = !q || [item.candidate_name, item.candidate_email, item.opportunity_title].some(value => String(value ?? "").toLowerCase().includes(q));
      const matchesStatus = applicationFilter === "All" || item.status === applicationFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, search, applicationFilter]);

  const postInternship = async (event: FormEvent<HTMLFormElement>) => {
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
            min_tenth_percentage: optionalNumber(form.min_tenth_percentage),
            min_twelfth_percentage: optionalNumber(form.min_twelfth_percentage),
            min_diploma_percentage: optionalNumber(form.min_diploma_percentage),
            max_active_backlogs: optionalNumber(form.max_active_backlogs),
            min_semester: optionalNumber(form.min_semester),
            max_semester: optionalNumber(form.max_semester),
            eligible_degrees: parseList(form.eligible_degrees),
            eligible_branches: parseList(form.eligible_branches),
            eligible_graduation_years: parseList(form.eligible_graduation_years)
              .map(year => Number(year))
              .filter(year => Number.isInteger(year)),
            other_requirements: form.other_requirements.trim() || null
          }
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to post internship.");
      setNotice("Internship posted successfully.");
      setForm(emptyForm);
      setShowPostForm(false);
      setActiveTab("Post Internships");
      await loadDashboard();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to post internship.");
    } finally {
      setBusy(false);
    }
  };

  const updateApplication = async (applicationId: number, status: string) => {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update_application", application_id: applicationId, status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update application.");
      setNotice(result.message);
      await loadDashboard();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update application.");
    } finally {
      setBusy(false);
    }
  };

  const updateOpportunity = async (opportunityId: number, status: "Open" | "Closed") => {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update_opportunity", opportunity_id: opportunityId, status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update internship.");
      setNotice(result.message);
      await loadDashboard();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update internship.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  };

  const number = (value: number | string | undefined) => Number(value ?? 0).toLocaleString("en-IN");
  const stats = data?.stats;
  const trend = data?.applicationTrend ?? [];
  const maxTrend = Math.max(1, ...trend.map(item => Number(item.applications)));
  const totalByType = (data?.applicationsByType ?? []).reduce((sum, item) => sum + Number(item.applications), 0);

  const renderApplicationsTable = (items: Application[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#17172f] text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Match</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Update</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.application_id} className="border-t border-white/[0.06] hover:bg-white/[0.025]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 font-semibold text-fuchsia-200">{initials(item.candidate_name || `Candidate ${index + 1}`)}</span>
                  <span><span className="block font-medium text-white">{item.candidate_name || "Candidate"}</span><span className="text-xs text-slate-500">{item.candidate_email}</span></span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{item.opportunity_title}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-300">{item.match_score == null ? "—" : `${Number(item.match_score).toFixed(0)}%`}</span></td>
              <td className="px-4 py-3 text-slate-400">{dateLabel(item.applied_at || item.applied_date)}</td>
              <td className="px-4 py-3"><StatusPill status={item.status || item.current_stage}/></td>
              <td className="px-4 py-3">
                <select disabled={busy} value={item.status || "Applied"} onChange={event => updateApplication(item.application_id, event.target.value)} className="rounded-lg border border-white/10 bg-[#111326] px-2 py-2 text-xs text-slate-200 outline-none focus:border-fuchsia-400">
                  {["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected"].map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No applications match this view yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#080817] text-white selection:bg-fuchsia-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-700/10 blur-[130px]"/><div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-[130px]"/></div>
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-violet-400/20 bg-[#080817]/95 px-5 backdrop-blur-2xl lg:px-9">
        <div className="flex items-center gap-4">
          <BrandMark />
          <span className="text-2xl font-extrabold tracking-tight">Intern<span className="text-fuchsia-400">Hub</span></span>
          <span className="hidden rounded-full border border-fuchsia-500/40 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-fuchsia-200 sm:inline-flex"><Icon name="building" size={17}/>Company Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">{data?.company?.approval_status === "APPROVED" ? "Company account" : "Account review"}</span>
          <button onClick={() => setActiveTab("Company Profile")} className="grid h-10 w-10 place-items-center rounded-full border border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500 to-violet-700 font-bold">{initials(data?.company?.name || "Company")}</button>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm text-slate-300 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:text-white"><Icon name="logout" size={16}/>Sign out</button>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1900px]">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-[260px] shrink-0 border-r border-violet-400/15 bg-[#090a1d]/85 p-4 lg:block">
          <div className="space-y-2">
            {navigation.map(item => <button key={item.label} onClick={() => { setActiveTab(item.label); setNotice(""); }} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${activeTab === item.label ? "border border-fuchsia-400/50 bg-gradient-to-r from-purple-700/50 to-fuchsia-700/20 text-white shadow-[0_0_22px_rgba(168,85,247,.12)]" : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 text-fuchsia-200"><Icon name={item.icon} size={19}/></span>{item.label}</button>)}
          </div>
          <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-widest text-slate-500">Signed in as</p><p className="mt-2 truncate font-semibold">{data?.company?.name || "Company"}</p><p className="mt-1 text-xs text-slate-500">{data?.company?.industry || "Company account"}</p></div>
        </aside>

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {navigation.map(item => <button key={item.label} onClick={() => setActiveTab(item.label)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs ${activeTab === item.label ? "border-fuchsia-400 bg-purple-500/20 text-white" : "border-white/10 text-slate-400"}`}><Icon name={item.icon} size={16}/>{item.label}</button>)}
          </div>

          {loading && <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-400/20 border-t-fuchsia-400"/><p className="mt-4 text-sm text-slate-400">Loading your company workspace…</p></div></div>}
          {!loading && error && <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center"><p className="text-lg font-semibold text-rose-200">Unable to open Company Portal</p><p className="mt-2 text-sm text-rose-100/70">{error}</p><button onClick={loadDashboard} className="mt-5 rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold">Try again</button></div>}

          {!loading && data && <>
            {notice && <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
            {data.company.approval_status !== "APPROVED" && <div className={`mb-6 rounded-xl border p-4 ${data.company.approval_status === "REJECTED" ? "border-rose-400/30 bg-rose-500/10" : "border-amber-400/30 bg-amber-500/10"}`}><p className="font-semibold">{data.company.approval_status === "REJECTED" ? "Company registration was rejected" : "Company approval pending"}</p><p className="mt-1 text-sm text-slate-300">{data.company.approval_status === "REJECTED" ? "Please contact the InternHub administrator for more information." : "Your company profile is awaiting Super Admin approval. You can view this dashboard, but posting internships is disabled until approval."}</p></div>}

            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div><p className="text-sm font-medium text-fuchsia-300">COMPANY WORKSPACE</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, {data.company.name} <span className="ml-1 inline-block text-2xl text-fuchsia-300">✦</span></h1><p className="mt-2 text-sm text-slate-400">Manage your internship postings, review applications, and find the best talent.</p></div>
              <button onClick={loadDashboard} className="w-fit rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:border-fuchsia-400/50 hover:text-white"><Icon name="refresh" size={16}/>Refresh data</button>
            </div>

            {activeTab === "Dashboard" && <>
              <div className="mb-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <MetricCard icon="rocket" value={number(stats?.active_postings)} label="Active Postings" color="purple" gradientIcon="rocket"/>
                <MetricCard icon="send" value={number(stats?.total_applications)} label="Total Applications" color="blue" gradientIcon="send"/>
                <MetricCard icon="badge" value={number(stats?.shortlisted)} label="Shortlisted" color="green" gradientIcon="verified"/>
                <MetricCard icon="calendar" value={number(stats?.hired)} label="Hired / Selected" color="pink" gradientIcon="interview"/>
              </div>
              <div className="mb-5 grid gap-5 2xl:grid-cols-[1.7fr_1fr]">
                <Panel title="Applications Overview" icon="analytics">
                  <div className="mb-3 flex items-center justify-between"><p className="text-xs text-slate-500">Daily applications · last 30 days</p><span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400">Live database</span></div>
                  {trend.length ? <div className="h-[230px] w-full"><svg viewBox="0 0 720 230" className="h-full w-full" preserveAspectRatio="none"><defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#c026d3" stopOpacity=".42"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3,4].map(i => <g key={i}><line x1="38" x2="710" y1={18+i*45} y2={18+i*45} stroke="#ffffff" strokeOpacity=".08"/><text x="4" y={22+i*45} fill="#64748b" fontSize="11">{Math.round(maxTrend*(4-i)/4)}</text></g>)}<polyline fill="none" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={trend.map((item,i)=>`${38+(i/Math.max(1,trend.length-1))*672},${198-(Number(item.applications)/maxTrend)*180}`).join(" ")}/><polygon fill="url(#trendFill)" points={`38,198 ${trend.map((item,i)=>`${38+(i/Math.max(1,trend.length-1))*672},${198-(Number(item.applications)/maxTrend)*180}`).join(" ")} 710,198`}/>{trend.map((item,i)=><circle key={item.day} cx={38+(i/Math.max(1,trend.length-1))*672} cy={198-(Number(item.applications)/maxTrend)*180} r="3.5" fill="#f0abfc"/> )}</svg></div> : <EmptyState text="Application trend data will appear here when students apply."/>}
                </Panel>
                <Panel title="Applications by Opportunity Type" icon="layers">
                  {data.applicationsByType.length ? <div className="space-y-5">{data.applicationsByType.map((item,i)=>{const colors=["bg-fuchsia-500","bg-cyan-400","bg-emerald-400"];const pct=totalByType?Math.round(Number(item.applications)/totalByType*100):0;return <div key={item.role}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-200">{item.role}</span><span className="text-slate-400">{pct}% · {item.applications}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full rounded-full ${colors[i%colors.length]}`} style={{width:`${pct}%`}}/></div></div>})}<p className="text-xs text-slate-500">Grouped by the opportunity types stored in your database.</p></div> : <EmptyState text="Post an opportunity to see its application breakdown."/>}
                </Panel>
              </div>
              <div className="grid gap-5 2xl:grid-cols-[1.5fr_1fr]">
                <Panel title="Recent Applications" icon="send" action={<button onClick={()=>setActiveTab("Applications")} className="text-sm font-semibold text-fuchsia-300 hover:text-white">View all →</button>}>{renderApplicationsTable(recentApplications.slice(0,5))}</Panel>
                <Panel title="Quick Actions" icon="spark"><div className="grid grid-cols-2 gap-3">{[{icon:"rocket" as IconName,label:"Post Internship",tab:"Post Internships" as Tab},{icon:"send" as IconName,label:"Review Applications",tab:"Applications" as Tab},{icon:"analytics" as IconName,label:"View Analytics",tab:"Analytics" as Tab},{icon:"building" as IconName,label:"Company Profile",tab:"Company Profile" as Tab}].map(item=><button key={item.label} onClick={()=>{setActiveTab(item.tab);if(item.tab==="Post Internships")setShowPostForm(true)}} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-fuchsia-400/35 bg-gradient-to-br from-purple-500/15 to-transparent p-3 text-center transition hover:border-fuchsia-300 hover:bg-purple-500/20"><Icon name={item.icon as IconName} size={34}/><span className="text-sm font-medium">{item.label}</span></button>)}</div></Panel>
              </div>
            </>}

            {activeTab === "Post Internships" && <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Internship Postings</h2><p className="mt-1 text-sm text-slate-400">Create and manage opportunities published by {data.company.name}.</p></div><button disabled={data.company.approval_status!=="APPROVED"} onClick={()=>setShowPostForm(v=>!v)} className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-purple-950/30 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="plus" size={17}/>Create Posting</button></div>
              {showPostForm && <Panel title="Create a new opportunity" icon="rocket"><form onSubmit={postInternship} className="grid gap-4 md:grid-cols-2"><Field label="Internship / role title"><input required maxLength={100} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Machine Learning Intern" className="field"/></Field><Field label="Opportunity type"><select value={form.opportunity_type} onChange={e=>setForm({...form,opportunity_type:e.target.value})} className="field"><option>Internship</option><option>Project</option><option>Full-Time</option></select></Field><Field label="Stipend (INR)"><input type="number" min="0" step="1" value={form.stipend} onChange={e=>setForm({...form,stipend:e.target.value})} placeholder="e.g. 25000" className="field"/></Field><Field label="Application deadline"><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} className="field"/></Field><div className="md:col-span-2"><Field label="Required skills"><textarea required value={form.required_skills} onChange={e=>setForm({...form,required_skills:e.target.value})} rows={2} placeholder="Python, SQL, Machine Learning…" className="field"/></Field></div><div className="md:col-span-2"><Field label="Description"><textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={5} placeholder="Describe the role, responsibilities and expectations…" className="field"/></Field></div>
                <div className="md:col-span-2 mt-2 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-purple-500/[0.09] to-fuchsia-500/[0.04] p-4 sm:p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-white">Academic Eligibility Criteria</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Set only the requirements that apply. Leave a field blank if your opportunity has no restriction for it. Students will still be able to view the opportunity if they do not meet a criterion.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Minimum CGPA (out of 10)"><input type="number" min="0" max="10" step="0.01" value={form.min_cgpa} onChange={e=>setForm({...form,min_cgpa:e.target.value})} placeholder="e.g. 7.5" className="field"/></Field>
                    <Field label="Maximum active backlogs"><input type="number" min="0" step="1" value={form.max_active_backlogs} onChange={e=>setForm({...form,max_active_backlogs:e.target.value})} placeholder="e.g. 0" className="field"/></Field>
                    <Field label="Minimum 10th percentage"><input type="number" min="0" max="100" step="0.01" value={form.min_tenth_percentage} onChange={e=>setForm({...form,min_tenth_percentage:e.target.value})} placeholder="e.g. 60" className="field"/></Field>
                    <Field label="Minimum 12th percentage"><input type="number" min="0" max="100" step="0.01" value={form.min_twelfth_percentage} onChange={e=>setForm({...form,min_twelfth_percentage:e.target.value})} placeholder="e.g. 60" className="field"/></Field>
                    <Field label="Minimum diploma percentage"><input type="number" min="0" max="100" step="0.01" value={form.min_diploma_percentage} onChange={e=>setForm({...form,min_diploma_percentage:e.target.value})} placeholder="Leave blank if not applicable" className="field"/></Field>
                    <Field label="Minimum semester"><input type="number" min="1" max="20" step="1" value={form.min_semester} onChange={e=>setForm({...form,min_semester:e.target.value})} placeholder="e.g. 5" className="field"/></Field>
                    <Field label="Maximum semester"><input type="number" min="1" max="20" step="1" value={form.max_semester} onChange={e=>setForm({...form,max_semester:e.target.value})} placeholder="e.g. 8" className="field"/></Field>
                    <Field label="Eligible degrees"><input value={form.eligible_degrees} onChange={e=>setForm({...form,eligible_degrees:e.target.value})} placeholder="B.Tech, B.E., BCA" className="field"/><span className="block text-[11px] text-slate-500">Separate multiple values with commas.</span></Field>
                    <Field label="Eligible branches"><input value={form.eligible_branches} onChange={e=>setForm({...form,eligible_branches:e.target.value})} placeholder="CSE, AIML, ECE" className="field"/><span className="block text-[11px] text-slate-500">Separate multiple values with commas.</span></Field>
                    <Field label="Eligible graduation years"><input value={form.eligible_graduation_years} onChange={e=>setForm({...form,eligible_graduation_years:e.target.value})} placeholder="2027, 2028" className="field"/><span className="block text-[11px] text-slate-500">Enter years separated by commas.</span></Field>
                    <div className="sm:col-span-2 lg:col-span-3"><Field label="Other academic requirements"><textarea value={form.other_requirements} onChange={e=>setForm({...form,other_requirements:e.target.value})} rows={2} placeholder="Any additional academic conditions…" className="field"/></Field></div>
                  </div>
                </div>
                <div className="flex gap-3 md:col-span-2"><button disabled={busy||data.company.approval_status!=="APPROVED"} className="rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy?"Publishing…":"Publish Opportunity"}</button><button type="button" onClick={()=>setShowPostForm(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300">Cancel</button></div></form></Panel>}
              <Panel title={`Your postings (${opportunities.length})`} icon="layers"><div className="space-y-3">{opportunities.map(item=><div key={item.opportunity_id} className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><StatusPill status={item.status}/></div><p className="mt-1 text-xs text-slate-500">{item.opportunity_type} · {money(item.stipend)} · Deadline: {dateLabel(item.deadline)}</p><p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.description}</p><p className="mt-2 text-xs text-slate-500">Skills: {item.required_skills || "Not specified"}</p></div><button disabled={busy} onClick={()=>updateOpportunity(item.opportunity_id,item.status==="Open"?"Closed":"Open")} className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-fuchsia-400/50">{item.status==="Open"?"Close posting":"Reopen posting"}</button></div>)}{!opportunities.length&&<EmptyState text="You have not posted any opportunities yet."/>}</div></Panel>
            </div>}

            {activeTab === "Applications" && <Panel title="Applications" icon="layers"><div className="mb-4 flex flex-col gap-3 md:flex-row"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search candidate, email or role…" className="field flex-1"/><select value={applicationFilter} onChange={e=>setApplicationFilter(e.target.value)} className="field md:max-w-52">{["All","Applied","Under Review","Shortlisted","Interview","Selected","Rejected"].map(v=><option key={v}>{v}</option>)}</select></div>{renderApplicationsTable(filteredApplications)}</Panel>}

            {activeTab === "Candidates" && <Panel title="Candidates" icon="users"><p className="mb-4 text-sm text-slate-400">Candidates who have applied to your company's opportunities.</p><div className="grid gap-3 md:grid-cols-2">{applications.map(item=><div key={item.application_id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-purple-500/20 font-bold text-fuchsia-200">{initials(item.candidate_name)}</span><div className="min-w-0"><p className="truncate font-semibold">{item.candidate_name}</p><p className="truncate text-xs text-slate-500">{item.candidate_email}</p></div><div className="ml-auto"><StatusPill status={item.status}/></div></div><div className="mt-4 flex justify-between text-xs text-slate-400"><span>{item.opportunity_title}</span><span>{item.match_score == null?"Match N/A":`${Number(item.match_score).toFixed(0)}% match`}</span></div></div>)}{!applications.length&&<EmptyState text="Candidate profiles will appear when applications arrive."/>}</div></Panel>}

            {activeTab === "Analytics" && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><MetricCard icon="layers" value={number(stats?.total_postings)} label="All Postings" color="purple"/><MetricCard icon="send" value={number(stats?.total_applications)} label="Applications Received" color="blue"/><MetricCard icon="badge" value={number(stats?.shortlisted)} label="Shortlisted Candidates" color="green"/></div><Panel title="Application activity" icon="analytics"><p className="mb-4 text-sm text-slate-400">Daily applications received over the last 30 days.</p>{trend.length?<div className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-15">{trend.map(item=><div key={item.day} title={`${dateLabel(item.day)}: ${item.applications} applications`} className="flex flex-col items-center gap-2"><div className="flex h-36 w-full items-end rounded-lg bg-white/[0.035] p-1"><div className="w-full rounded-md bg-gradient-to-t from-purple-700 to-fuchsia-400" style={{height:`${Math.max(4,Number(item.applications)/maxTrend*100)}%`}}/></div><span className="text-[10px] text-slate-500">{new Date(item.day).getDate()}</span></div>)}</div>:<EmptyState text="No application activity in this period yet."/>}</Panel><Panel title="Applications by opportunity type" icon="layers"><div className="space-y-4">{data.applicationsByType.map(item=><div key={item.role}><div className="mb-1 flex justify-between text-sm"><span>{item.role}</span><span className="text-slate-400">{item.applications}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{width:`${totalByType?Number(item.applications)/totalByType*100:0}%`}}/></div></div>)}</div></Panel></div>}

            {activeTab === "Company Profile" && <Panel title="Company Profile" icon="building"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-20 w-20 place-items-center rounded-2xl border border-fuchsia-400/40 bg-purple-500/15 text-3xl font-bold text-fuchsia-200">{initials(data.company.name)}</div><div><h2 className="text-2xl font-bold">{data.company.name}</h2><p className="text-sm text-slate-400">{data.company.industry || "Industry not provided"}</p><StatusPill status={data.company.approval_status}/></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><ProfileItem label="Company name" value={data.company.name}/><ProfileItem label="Industry" value={data.company.industry}/><ProfileItem label="Location" value={data.company.location}/><ProfileItem label="Website" value={data.company.website}/><ProfileItem label="Company ID" value={String(data.company.company_id)}/><ProfileItem label="Approval status" value={data.company.approval_status}/></div><p className="mt-5 text-xs text-slate-500">Profile editing will be enabled once the company profile update workflow is connected.</p></Panel>}

            {activeTab === "Settings" && <Panel title="Account Settings" icon="settings"><div className="max-w-2xl space-y-4"><div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="font-semibold">Company account</p><p className="mt-1 text-sm text-slate-400">Signed in as {data.company.name}. Your dashboard data is restricted to this company account.</p></div><div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="font-semibold">Account approval</p><p className="mt-1 text-sm text-slate-400">Current status: {data.company.approval_status}</p></div><button onClick={logout} className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/20">Sign out of InternHub</button></div></Panel>}
          </>}
        </section>
      </div>
      <style jsx global>{`
        .field{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#101226;padding:11px 13px;color:#f8fafc;outline:none;font-size:14px}
        .field:focus{border-color:rgba(217,70,239,.75);box-shadow:0 0 0 3px rgba(217,70,239,.1)}
        .field::placeholder{color:#64748b}
        .field option{background:#101226;color:#fff}
        textarea.field{resize:vertical}
      `}</style>
    </main>
  );
}

type IconName = "dashboard" | "rocket" | "layers" | "users" | "analytics" | "building" | "settings" | "send" | "badge" | "calendar" | "spark" | "logout" | "refresh" | "plus";

function BrandMark() {
  return <div className="grid h-11 w-11 place-items-center rounded-2xl border border-fuchsia-400/70 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 shadow-[0_0_28px_rgba(168,85,247,.28)]">
    <svg viewBox="0 0 48 32" className="h-7 w-9" fill="none" aria-label="InternHub logo">
      <defs><linearGradient id="brandInfinity" x1="2" y1="3" x2="46" y2="29"><stop stopColor="#A855F7"/><stop offset=".52" stopColor="#E879F9"/><stop offset="1" stopColor="#7C3AED"/></linearGradient></defs>
      <path d="M24 16C18 7 13 4 8.5 7.5 3 11.8 4.5 22 11 24.5c4.8 1.8 8.2-1.8 13-8.5 4.8-6.7 8.2-10.3 13-8.5 6.5 2.5 8 12.7 2.5 17-4.5 3.5-9.5.5-15.5-8.5Z" stroke="url(#brandInfinity)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>;
}

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", fill: "none", className: "shrink-0 drop-shadow-[0_3px_8px_rgba(168,85,247,.3)]", "aria-hidden": true as const };
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="8" y="8" width="20" height="20" rx="5" fill="url(#violet)"/><rect x="36" y="8" width="20" height="20" rx="5" fill="url(#pink)"/><rect x="8" y="36" width="20" height="20" rx="5" fill="url(#blue)"/><rect x="36" y="36" width="20" height="20" rx="5" fill="url(#violet)"/></>,
    rocket: <><path d="M18 42 12 54l14-5 5-8" fill="#7C3AED"/><path d="M23 39 16 32C22 18 36 9 53 8c-1 17-10 31-24 37l-6-6Z" fill="url(#pink)"/><path d="M25 42c-5 1-10 5-12 12 7-2 11-6 12-12Z" fill="#38BDF8"/><circle cx="39" cy="24" r="6" fill="#20123F" stroke="#F5D0FE" strokeWidth="3"/><path d="m18 32-7 2 5-9 8-2" fill="#C084FC"/></>,
    layers: <><path d="m32 7 25 14-25 14L7 21 32 7Z" fill="url(#pink)"/><path d="m7 30 25 14 25-14v8L32 53 7 38v-8Z" fill="url(#violet)"/><path d="m7 42 25 14 25-14v7L32 63 7 49v-7Z" fill="#7C3AED"/></>,
    users: <><circle cx="24" cy="23" r="10" fill="url(#pink)"/><circle cx="44" cy="25" r="8" fill="url(#blue)"/><path d="M5 54c1-12 8-18 19-18s18 6 19 18H5Z" fill="url(#violet)"/><path d="M38 39c11-3 20 3 21 15H43" fill="#0EA5E9"/></>,
    analytics: <><rect x="8" y="36" width="12" height="20" rx="4" fill="url(#pink)"/><rect x="26" y="23" width="12" height="33" rx="4" fill="url(#violet)"/><rect x="44" y="9" width="12" height="47" rx="4" fill="url(#blue)"/><path d="m9 27 16-8 10 3L53 7" stroke="#F0ABFC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M43 7h10v10" stroke="#F0ABFC" strokeWidth="4" strokeLinecap="round"/></>,
    building: <><path d="M9 55V17l23-10v48H9Z" fill="url(#violet)"/><path d="M32 25h23v30H32V25Z" fill="url(#pink)"/><path d="M17 22h6v7h-6zm0 13h6v7h-6zm18-2h6v7h-6zm10 0h5v7h-5zM27 44h10v11H27z" fill="#F5D0FE"/></>,
    settings: <><path d="m27 5 10 0 2 8 6 3 7-3 6 9-6 6v7l6 6-6 9-8-3-6 3-2 8H27l-2-8-6-3-7 3-6-9 6-6v-7l-6-6 6-9 8 3 6-3 1-8Z" fill="url(#violet)"/><circle cx="32" cy="34" r="10" fill="#21113D" stroke="#E9D5FF" strokeWidth="4"/></>,
    send: <><path d="M7 29 56 7 39 57 29 37 7 29Z" fill="url(#blue)"/><path d="m29 37 27-30" stroke="#DBEAFE" strokeWidth="3"/><path d="m29 37-3 13" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round"/></>,
    badge: <><path d="m32 5 8 6 10-1 3 10 7 7-5 9 1 10-10 3-6 8-9-5-10 2-4-9-8-6 4-10-2-10 10-4 5-9Z" fill="url(#green)"/><path d="m18 32 9 9 19-20" stroke="#D1FAE5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></>,
    calendar: <><rect x="8" y="13" width="48" height="43" rx="9" fill="url(#pink)"/><rect x="13" y="20" width="38" height="30" rx="5" fill="#21143C"/><path d="M20 7v13M44 7v13" stroke="#FFF7ED" strokeWidth="6" strokeLinecap="round"/><circle cx="32" cy="34" r="7" fill="#FBBF24"/><path d="M20 47c1-7 5-10 12-10s11 3 12 10" fill="#FDBA74"/></>,
    spark: <><path d="M32 5 39 24 59 32 39 40 32 59 25 40 5 32 25 24 32 5Z" fill="url(#pink)"/><path d="m49 6 2 6 7 2-7 2-2 7-2-7-7-2 7-2 2-6Z" fill="#FDE68A"/></>,
    logout: <><path d="M30 12H13a5 5 0 0 0-5 5v30a5 5 0 0 0 5 5h17" stroke="#E9D5FF" strokeWidth="5" strokeLinecap="round"/><path d="M35 20 49 32 35 44M49 32H22" stroke="url(#pink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></>,
    refresh: <><path d="M52 25A21 21 0 0 0 15 16l-5 7m0 0V10m0 13h13M12 39a21 21 0 0 0 37 9l5-7m0 0v13m0-13H41" stroke="url(#pink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></>,
    plus: <><circle cx="32" cy="32" r="25" fill="url(#violet)"/><path d="M32 18v28M18 32h28" stroke="#FFF" strokeWidth="6" strokeLinecap="round"/></>
  };
  return <svg {...common}><defs>
    <linearGradient id="violet" x1="8" y1="4" x2="56" y2="60"><stop stopColor="#E879F9"/><stop offset=".5" stopColor="#A855F7"/><stop offset="1" stopColor="#6D28D9"/></linearGradient>
    <linearGradient id="pink" x1="8" y1="8" x2="56" y2="56"><stop stopColor="#F0ABFC"/><stop offset=".5" stopColor="#D946EF"/><stop offset="1" stopColor="#9333EA"/></linearGradient>
    <linearGradient id="blue" x1="8" y1="5" x2="56" y2="58"><stop stopColor="#67E8F9"/><stop offset=".5" stopColor="#38BDF8"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
    <linearGradient id="green" x1="8" y1="5" x2="56" y2="58"><stop stopColor="#6EE7B7"/><stop offset=".5" stopColor="#10B981"/><stop offset="1" stopColor="#047857"/></linearGradient>
  </defs>{paths[name]}</svg>;
}

function Panel({ title, icon, action, children }: { title: string; icon: IconName; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-[22px] border border-violet-400/25 bg-gradient-to-br from-[#15152f]/95 via-[#101329]/95 to-[#090b1c]/95 shadow-[0_18px_55px_rgba(0,0,0,.24)]"><div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4"><h2 className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10"><Icon name={icon} size={25}/></span>{title}</h2>{action}</div><div className="p-4 sm:p-5">{children}</div></section>;
}

type KpiGradientIconName = "rocket" | "send" | "verified" | "interview";

function KpiGradientIcon({ name, size = 57, className = "" }: { name: KpiGradientIconName; size?: number; className?: string }) {
  const uniqueId = useId().replace(/:/g, "");
  const gradient = `company-kpi-gradient-${uniqueId}`;
  const palettes: Record<KpiGradientIconName, [string, string, string]> = {
    rocket: ["#FF5ACD", "#B44DFF", "#6477FF"],
    send: ["#5CF4FF", "#3B9CFF", "#7165FF"],
    verified: ["#67F8D0", "#19D6A4", "#00A879"],
    interview: ["#FFE078", "#FF9C59", "#FF59B8"],
  };
  const [c1, c2, c3] = palettes[name];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 overflow-visible ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="5" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor={c1}/><stop offset=".52" stopColor={c2}/><stop offset="1" stopColor={c3}/>
        </linearGradient>
        <filter id={`${gradient}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <g filter={`url(#${gradient}-glow)`}>
        {name === "rocket" && <>
          <path d="M25 41C14 40 9 49 7 57C16 54 25 51 30 43" fill={c1} opacity=".8"/>
          <path d="M23 35C18 27 24 17 35 9C43 3 53 4 57 5C58 18 54 30 46 39L35 50L23 35Z" fill={`url(#${gradient})`}/>
          <path d="M33 13C39 8 46 7 52 8C53 15 51 22 47 28L33 13Z" fill="white" opacity=".22"/>
          <circle cx="43" cy="20" r="6" fill="#11152D" stroke="white" strokeWidth="2.5"/>
          <path d="M24 33L14 36L7 47L25 42" fill={c2}/><path d="M35 47L31 57L19 62L25 43" fill={c3}/>
        </>}
        {name === "send" && <>
          <path d="M5 29L57 6L38 58L29 36L5 29Z" fill={`url(#${gradient})`}/>
          <path d="M5 29L57 6L29 36L5 29Z" fill="white" opacity=".18"/>
          <path d="M29 36L57 6L38 58L29 36Z" fill={c3} opacity=".65"/>
          <path d="M12 45C8 49 7 53 7 57" stroke={c1} strokeWidth="3" strokeLinecap="round"/>
        </>}
        {name === "verified" && <>
          <path d="M32 4L40 8L49 8L53 17L60 25L56 34L58 44L49 51L45 60L34 58L25 62L18 55L9 52L9 42L4 33L10 24L11 15L21 11L27 5L32 4Z" fill={`url(#${gradient})`}/>
          <path d="M32 11L38 15L46 14L49 22L54 28L51 35L53 42L45 47L41 54L33 52L26 56L21 49L13 46L15 38L11 31L17 24L17 17L26 17L32 11Z" fill="#082B2A" opacity=".48"/>
          <path d="M19 32L28 41L46 22" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        </>}
        {name === "interview" && <>
          <rect x="7" y="12" width="50" height="46" rx="10" fill={`url(#${gradient})`}/>
          <rect x="12" y="22" width="40" height="30" rx="5" fill="#17152D"/>
          <path d="M18 7V18M46 7V18" stroke="white" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="32" cy="33" r="6" fill={c1}/>
          <path d="M21 49C21 41 25 38 32 38C39 38 43 41 43 49" fill={c2}/>
        </>}
      </g>
    </svg>
  );
}

function MetricCard({ icon, value, label, color, gradientIcon }: { icon: IconName; value: string; label: string; color: "purple" | "blue" | "green" | "pink"; gradientIcon?: "rocket" | "send" | "verified" | "interview" }) {
  const styles = {
    purple: "border-fuchsia-500/35 from-fuchsia-500/20 via-purple-500/[0.08] to-[#111329]",
    blue: "border-sky-500/35 from-sky-500/20 via-blue-500/[0.08] to-[#101329]",
    green: "border-emerald-500/35 from-emerald-500/20 via-teal-500/[0.08] to-[#101329]",
    pink: "border-pink-500/35 from-pink-500/20 via-orange-500/[0.08] to-[#111329]"
  };
  return <div className={`group relative overflow-hidden rounded-[22px] border bg-gradient-to-br p-5 shadow-[0_14px_40px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(168,85,247,.13)] ${styles[color]}`}>
    <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.035] blur-2xl"/>
    <div className="relative flex items-center gap-4"><div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl bg-black/15">{gradientIcon ? <KpiGradientIcon name={gradientIcon} size={57} className="drop-shadow-[0_0_13px_rgba(190,80,255,0.35)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"/> : <Icon name={icon} size={62}/>}</div><div className="min-w-0"><p className="text-3xl font-extrabold tracking-tight text-white">{value}</p><p className="mt-1 text-sm font-semibold text-slate-200">{label}</p><p className="mt-1 text-[11px] text-slate-500">{label === "Active Postings" ? "Published opportunities" : label === "Total Applications" ? "Received applications" : label === "Shortlisted" ? "Candidates selected" : "Final selections"}</p></div></div>
  </div>;
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "Applied").toLowerCase();
  const style = ["shortlisted","selected","hired","approved","open","offer"].includes(normalized) ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" : ["rejected","closed"].includes(normalized) ? "bg-rose-500/15 text-rose-300 border-rose-400/20" : ["pending"].includes(normalized) ? "bg-amber-500/15 text-amber-200 border-amber-400/20" : "bg-violet-500/15 text-violet-200 border-violet-400/20";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-slate-500">{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>{children}</label>;
}

function ProfileItem({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-medium text-slate-200">{value || "Not provided"}</p></div>;
}
