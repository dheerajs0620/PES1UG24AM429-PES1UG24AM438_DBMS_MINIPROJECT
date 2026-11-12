
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudentNavbar from "../../components/StudentNavbar";
import SkillManager from "./SkillManager";

type Profile = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  major: string | null;
  graduation_year: number | null;
  college: string | null;
  phone: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_summary: string | null;
  updated_at: string | null;
};

type Resume = {
  resume_id: number;
  file_name: string;
  uploaded_at: string;
  is_active: boolean;
};

type AcademicProfile = {
  degree: string;
  cgpa: string;
  tenth_percentage: string;
  twelfth_percentage: string;
  diploma_percentage: string;
  active_backlogs: string;
  current_semester: string;
};

const emptyAcademicProfile: AcademicProfile = {
  degree: "",
  cgpa: "",
  tenth_percentage: "",
  twelfth_percentage: "",
  diploma_percentage: "",
  active_backlogs: "",
  current_semester: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#090d1d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-purple-500/10";

const labelClass = "text-sm font-medium text-slate-300";

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-purple-500/10 text-xl text-fuchsia-300">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>

      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
      />
    </label>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [academic, setAcademic] = useState<AcademicProfile>(emptyAcademicProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAllResumes, setShowAllResumes] = useState(false);

  // Load profile and resume history
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [profileResponse, resumeResponse, academicResponse] = await Promise.all([
        fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        }),

        fetch("/api/profile/resumes", {
          credentials: "include",
          cache: "no-store",
        }),

        fetch("/api/academics", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (
        profileResponse.status === 401 ||
        profileResponse.status === 403
      ) {
        router.replace("/login");
        return;
      }

      const profileData = await profileResponse.json();
      const resumeData = await resumeResponse.json();
      const academicData = await academicResponse.json();

      if (!profileResponse.ok || !profileData.success) {
        throw new Error(
          profileData.message || "Unable to load your profile."
        );
      }

      setProfile(profileData.profile);

      if (academicResponse.ok && academicData.success && academicData.academicProfile) {
        const saved = academicData.academicProfile;
        setAcademic({
          degree: saved.degree ?? "",
          cgpa: saved.cgpa ?? "",
          tenth_percentage: saved.tenth_percentage ?? "",
          twelfth_percentage: saved.twelfth_percentage ?? "",
          diploma_percentage: saved.diploma_percentage ?? "",
          active_backlogs: saved.active_backlogs ?? "",
          current_semester: saved.current_semester ?? "",
        });
      }

      if (resumeResponse.ok && resumeData.success) {
        setResumes(resumeData.resumes || []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update individual profile fields
  function updateField(
    key: keyof Profile,
    value: string | number | null
  ) {
    setProfile((current) =>
      current ? { ...current, [key]: value } : current
    );

    setSuccess("");
  }

  // Update individual academic fields
  function updateAcademicField(key: keyof AcademicProfile, value: string) {
    setAcademic((current) => ({ ...current, [key]: value }));
    setSuccess("");
  }

  // Save academic information independently from the main profile form
  async function saveAcademicProfile() {
    setSavingAcademic(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/academics", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree: academic.degree.trim() || null,
          major: profile?.major?.trim() || null,
          graduation_year: profile?.graduation_year || null,
          cgpa: academic.cgpa === "" ? null : Number(academic.cgpa),
          tenth_percentage: academic.tenth_percentage === "" ? null : Number(academic.tenth_percentage),
          twelfth_percentage: academic.twelfth_percentage === "" ? null : Number(academic.twelfth_percentage),
          diploma_percentage: academic.diploma_percentage === "" ? null : Number(academic.diploma_percentage),
          active_backlogs: academic.active_backlogs === "" ? null : Number(academic.active_backlogs),
          current_semester: academic.current_semester === "" ? null : Number(academic.current_semester),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Unable to save academic information.");
      }

      setSuccess("Academic information saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save academic information.");
    } finally {
      setSavingAcademic(false);
    }
  }

  // Calculate profile completion
  const completion = useMemo(() => {
    if (!profile) return 0;

    const checks = [
      Boolean(profile.first_name?.trim()),
      Boolean(profile.last_name?.trim()),
      Boolean(profile.email?.trim()),
      Boolean(profile.phone?.trim()),

      Boolean(
        profile.major &&
          profile.major !== "Not specified"
      ),

      Boolean(
        profile.graduation_year &&
          profile.graduation_year > 0
      ),

      Boolean(profile.college?.trim()),
      Boolean(profile.portfolio_url?.trim()),
      Boolean(profile.linkedin_url?.trim()),
      Boolean(profile.github_url?.trim()),
      Boolean(profile.portfolio_summary?.trim()),
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [profile]);

  // Save profile
  async function saveProfile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),

          major: profile.major?.trim() || "",

          graduation_year: Number(profile.graduation_year),

          college: profile.college?.trim() || "",
          phone: profile.phone?.trim() || "",

          portfolio_url: profile.portfolio_url?.trim() || "",
          linkedin_url: profile.linkedin_url?.trim() || "",
          github_url: profile.github_url?.trim() || "",

          portfolio_summary:
            profile.portfolio_summary?.trim() || "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to save your profile."
        );
      }

      if (data.profile) {
        setProfile(data.profile);
      } else {
        await loadProfile();
      }

      setSuccess("Your profile has been saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070817] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-purple-500/20 border-t-fuchsia-400" />

          <p className="mt-4 text-sm text-slate-400">
            Preparing your profile...
          </p>
        </div>
      </main>
    );
  }

  // Profile loading error
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070817] px-5 text-white">
        <div className="max-w-md rounded-2xl border border-red-400/20 bg-[#111529] p-7 text-center">
          <p className="text-lg font-bold">
            Unable to load profile
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {error || "Please try again."}
          </p>

          <button
            onClick={loadProfile}
            className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold hover:bg-purple-500"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const fullName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  const activeResume = resumes.find(
    (resume) => resume.is_active
  );

  // Exclude active resume from previous versions
  const previousResumes = resumes.filter(
    (resume) => !resume.is_active
  );

  const visibleResumes = showAllResumes
    ? previousResumes
    : previousResumes.slice(0, 5);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">

      {/* Background lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[150px]" />

        <div className="absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[160px]" />

        <div className="absolute bottom-0 left-[35%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/[0.05] blur-[150px]" />
      </div>

      {/* Navbar */}
      <StudentNavbar
        rightContent={
          <Link
            href="/dashboard"
            className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-4 py-2.5 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20"
          >
            ← Dashboard
          </Link>
        }
      />

      <div className="relative mx-auto max-w-[1450px] px-5 py-9 lg:px-10 lg:py-12">

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
            Student Workspace
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Manage your personal information, academic details and
            professional presence in one place.
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {success}
          </div>
        )}

        {/* Profile overview */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#171a35] via-[#11162c] to-[#0c1122] p-6 shadow-2xl shadow-purple-950/10 sm:p-8">

          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-fuchsia-300/40 bg-gradient-to-br from-purple-600 to-blue-600 text-3xl font-extrabold text-white shadow-[0_0_35px_rgba(168,85,247,0.2)]">
                {profile.first_name?.[0]?.toUpperCase() || "S"}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-white">
                  {fullName || "Student"}
                </h2>

                <p className="mt-1 truncate text-sm text-slate-400">
                  {profile.email}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-300">
                    STUDENT
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                    ID #{profile.user_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile completion */}
            <div className="w-full max-w-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">
                  Profile completion
                </span>

                <span className="text-xl font-extrabold text-fuchsia-300">
                  {completion}%
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Complete your academic and professional details to
                strengthen your profile.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Skills Playground */}
        <div className="mb-8">
          <SkillManager />
        </div>

        {/* Profile form */}
        <form onSubmit={saveProfile}>

          <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1.5fr_0.85fr]">

            {/* Main form */}
            <div className="space-y-7">

              {/* Personal information */}
              <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-6 sm:p-8">

                <SectionHeading
                  icon="◉"
                  title="Personal Information"
                  description="Your basic account and contact details"
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <Field
                    label="First name"
                    value={profile.first_name}
                    onChange={(value) =>
                      updateField("first_name", value)
                    }
                    placeholder="Enter first name"
                    required
                  />

                  <Field
                    label="Last name"
                    value={profile.last_name}
                    onChange={(value) =>
                      updateField("last_name", value)
                    }
                    placeholder="Enter last name"
                    required
                  />

                  <div className="sm:col-span-2">
                    <Field
                      label="Email address"
                      value={profile.email}
                      onChange={(value) =>
                        updateField("email", value)
                      }
                      placeholder="your@email.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label="Phone number"
                      value={profile.phone || ""}
                      onChange={(value) =>
                        updateField("phone", value)
                      }
                      placeholder="Enter your contact number"
                      type="tel"
                    />
                  </div>

                </div>
              </section>

              {/* Academic details */}
              <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-6 sm:p-8">

                <SectionHeading
                  icon="▤"
                  title="Academic Information"
                  description="Your educational background"
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <div className="sm:col-span-2">
                    <Field
                      label="College / University"
                      value={profile.college || ""}
                      onChange={(value) =>
                        updateField("college", value)
                      }
                      placeholder="Enter your college"
                      required
                    />
                  </div>

                  <Field
                    label="Major / Branch"
                    value={
                      profile.major === "Not specified"
                        ? ""
                        : profile.major || ""
                    }
                    onChange={(value) =>
                      updateField("major", value)
                    }
                    placeholder="e.g. CSE - AIML"
                    required
                  />

                  <Field
                    label="Graduation year"
                    value={
                      profile.graduation_year &&
                      profile.graduation_year > 0
                        ? profile.graduation_year
                        : ""
                    }
                    onChange={(value) =>
                      updateField(
                        "graduation_year",
                        value === "" ? 0 : Number(value)
                      )
                    }
                    placeholder="e.g. 2028"
                    type="number"
                    min={2000}
                    max={2100}
                    required
                  />

                  <div className="sm:col-span-2 mt-3 border-t border-white/[0.08] pt-6">
                    <h3 className="text-base font-bold text-white">Academic Performance</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      These details help InternHub evaluate academic eligibility for internships. Leave a field blank if it does not apply or you do not have the information yet.
                    </p>
                  </div>

                  <Field
                    label="Degree"
                    value={academic.degree}
                    onChange={(value) => updateAcademicField("degree", value)}
                    placeholder="e.g. B.Tech"
                  />

                  <Field
                    label="CGPA (out of 10)"
                    value={academic.cgpa}
                    onChange={(value) => updateAcademicField("cgpa", value)}
                    placeholder="e.g. 7.50"
                    type="number"
                    min={0}
                    max={10}
                  />

                  <Field
                    label="10th percentage"
                    value={academic.tenth_percentage}
                    onChange={(value) => updateAcademicField("tenth_percentage", value)}
                    placeholder="e.g. 91.20"
                    type="number"
                    min={0}
                    max={100}
                  />

                  <Field
                    label="12th percentage"
                    value={academic.twelfth_percentage}
                    onChange={(value) => updateAcademicField("twelfth_percentage", value)}
                    placeholder="e.g. 95.00"
                    type="number"
                    min={0}
                    max={100}
                  />

                  <Field
                    label="Diploma percentage (if applicable)"
                    value={academic.diploma_percentage}
                    onChange={(value) => updateAcademicField("diploma_percentage", value)}
                    placeholder="Optional"
                    type="number"
                    min={0}
                    max={100}
                  />

                  <Field
                    label="Active backlogs"
                    value={academic.active_backlogs}
                    onChange={(value) => updateAcademicField("active_backlogs", value)}
                    placeholder="e.g. 0"
                    type="number"
                    min={0}
                    max={100}
                  />

                  <Field
                    label="Current semester"
                    value={academic.current_semester}
                    onChange={(value) => updateAcademicField("current_semester", value)}
                    placeholder="e.g. 5"
                    type="number"
                    min={1}
                    max={20}
                  />

                  <div className="sm:col-span-2 flex flex-col gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Academic details are saved separately from your personal profile.
                    </p>
                    <button
                      type="button"
                      onClick={saveAcademicProfile}
                      disabled={savingAcademic}
                      className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingAcademic ? "Saving academic details..." : "Save Academic Information →"}
                    </button>
                  </div>
                </div>
              </section>

              {/* Professional links */}
              <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-6 sm:p-8">

                <SectionHeading
                  icon="↗"
                  title="Professional Links"
                  description="Help recruiters explore your work"
                />

                <div className="space-y-5">

                  <Field
                    label="Portfolio URL"
                    value={profile.portfolio_url || ""}
                    onChange={(value) =>
                      updateField("portfolio_url", value)
                    }
                    placeholder="https://yourportfolio.com"
                    type="url"
                  />

                  <Field
                    label="LinkedIn URL"
                    value={profile.linkedin_url || ""}
                    onChange={(value) =>
                      updateField("linkedin_url", value)
                    }
                    placeholder="https://linkedin.com/in/username"
                    type="url"
                  />

                  <Field
                    label="GitHub URL"
                    value={profile.github_url || ""}
                    onChange={(value) =>
                      updateField("github_url", value)
                    }
                    placeholder="https://github.com/username"
                    type="url"
                  />

                </div>
              </section>

              {/* About */}
              <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-6 sm:p-8">

                <SectionHeading
                  icon="✎"
                  title="About Me"
                  description="Introduce yourself to potential recruiters"
                />

                <label className="block">
                  <span className={labelClass}>
                    Portfolio summary
                  </span>

                  <textarea
                    className={`${inputClass} min-h-36 resize-y`}
                    value={profile.portfolio_summary || ""}
                    onChange={(event) =>
                      updateField(
                        "portfolio_summary",
                        event.target.value
                      )
                    }
                    placeholder="Write a short introduction about your interests, skills, projects and career goals..."
                    maxLength={5000}
                  />

                  <span className="mt-2 block text-right text-xs text-slate-600">
                    {(profile.portfolio_summary || "").length}/5000
                  </span>
                </label>
              </section>

              {/* Save button */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={loadProfile}
                  disabled={saving}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  Reset changes
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save Profile Changes →"}
                </button>

              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-7">

              {/* Profile tips */}
              <section className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-[#191632] to-[#111326] p-6">

                <h3 className="font-bold text-white">
                  Build a stronger profile
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Recruiters use your profile to understand your
                  background and professional interests.
                </p>

                <div className="mt-5 space-y-3 text-sm text-slate-300">
                  {[
                    "Add your academic information",
                    "Keep your contact details updated",
                    "Link your GitHub projects",
                    "Write a meaningful introduction",
                    "Upload your own resume",
                    "Verify your extracted skills",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3"
                    >
                      <span className="text-fuchsia-400">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Resume management */}
              <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#14182d] to-[#0c1122] p-6">

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-white">
                    Resume Management
                  </h3>

                  <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-300">
                    {resumes.length} versions
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Your latest uploaded resume and previous versions.
                </p>

                {/* Active resume */}
                {activeResume ? (
                  <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Active resume
                      </span>

                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        Active
                      </span>
                    </div>

                    <p className="mt-3 break-all text-sm font-semibold text-white">
                      {activeResume.file_name}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Version #{activeResume.resume_id}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(activeResume.uploaded_at)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-center">
                    <p className="text-sm text-slate-400">
                      No active resume found.
                    </p>
                  </div>
                )}

                {/* Previous versions */}
                <div className="mt-6">

                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">
                      Previous versions
                    </h4>

                    <span className="text-xs text-slate-500">
                      {previousResumes.length} old
                    </span>
                  </div>

                  {previousResumes.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No previous resume versions available.
                    </p>
                  ) : (
                    <div className="space-y-3">

                      {visibleResumes.map((resume) => (
                        <div
                          key={resume.resume_id}
                          className="flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-lg text-fuchsia-300">
                            ▤
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="break-all text-xs font-semibold text-slate-200">
                              {resume.file_name}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-500">
                              Version #{resume.resume_id}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-600">
                              {formatDate(resume.uploaded_at)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {previousResumes.length > 5 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllResumes((value) => !value)
                          }
                          className="w-full rounded-xl border border-purple-400/20 bg-purple-500/[0.06] py-3 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/15"
                        >
                          {showAllResumes
                            ? "Show fewer versions ↑"
                            : `View all ${previousResumes.length} versions ↓`}
                        </button>
                      )}

                    </div>
                  )}
                </div>

                {/* Resume test data notice */}
                <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
                  <p className="text-xs font-bold text-amber-300">
                    Development test data
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    These resume records are currently being used to
                    test version management. Their contents should not
                    be treated as your personal CV information.
                  </p>
                </div>

                <Link
                  href="/recommendations"
                  className="mt-4 block rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.07] py-3 text-center text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/15"
                >
                  Go to Resume Upload / Recommendations →
                </Link>
              </section>

              {/* Account information */}
              <section className="rounded-3xl border border-white/[0.09] bg-[#101529] p-6">

                <h3 className="font-bold text-white">
                  Account Information
                </h3>

                <div className="mt-4 space-y-4">

                  <div>
                    <p className="text-xs text-slate-500">
                      Student ID
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      #{profile.user_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Account role
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {profile.role}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Last profile update
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {formatDate(profile.updated_at)}
                    </p>
                  </div>

                </div>
              </section>
            </aside>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-14 border-t border-white/[0.07] py-7 text-center text-xs text-slate-600">
          InternHub
          <span className="mx-2 text-fuchsia-500">·</span>
          Your journey, one opportunity at a time.
        </footer>

      </div>
    </main>
  );
}
