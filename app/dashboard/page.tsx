
"use client";

import StudentNavbar from "../../components/StudentNavbar";
import { useEffect, useId, useMemo, useState } from "react";
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
  company_id?: number;
  company_name?: string;
  company_industry?: string | null;
  company_website?: string | null;
  company_location?: string | null;
  opportunity_type?: string;
  description?: string;
  required_skills?: string;
  stipend?: string | number | null;
  deadline?: string | null;
};


function formatStipend(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

type GradientIconName =
  | "rocket"
  | "send"
  | "verified"
  | "interview"
  | "analytics"
  | "layers"
  | "compass"
  | "file"
  | "calendar"
  | "zap"
  | "wallet"
  | "clock"
  | "briefcase"
  | "location"
  | "bell"
  | "arrow";


/* -------------------------------------------------------
   CUSTOM GRADIENT ICON SYSTEM
   No containers. No external icon libraries.
------------------------------------------------------- */

function GradientIcon({
  name,
  size = 44,
  className = "",
}: {
  name: GradientIconName;
  size?: number;
  className?: string;
}) {
  const uniqueId = useId().replace(/:/g, "");
  const gradient = `internhub-gradient-${uniqueId}`;
  const secondary = `internhub-secondary-${uniqueId}`;

  const palettes: Record<GradientIconName, [string, string, string]> = {
    rocket: ["#FF5ACD", "#B44DFF", "#6477FF"],
    send: ["#5CF4FF", "#3B9CFF", "#7165FF"],
    verified: ["#67F8D0", "#19D6A4", "#00A879"],
    interview: ["#FFE078", "#FF9C59", "#FF59B8"],
    analytics: ["#FF64D8", "#B44DFF", "#4D9BFF"],
    layers: ["#D96BFF", "#A34FFF", "#6579FF"],
    compass: ["#FF65CF", "#B34DFF", "#667DFF"],
    file: ["#64E9FF", "#4B9FFF", "#8265FF"],
    calendar: ["#FFE078", "#FF9B54", "#F45CBA"],
    zap: ["#FFF078", "#FFAE43", "#FF5C91"],
    wallet: ["#FF70D8", "#B64DFF", "#6484FF"],
    clock: ["#FF70D8", "#A855F7", "#6484FF"],
    briefcase: ["#FF70D8", "#B64DFF", "#6484FF"],
    location: ["#64E9FF", "#4B9FFF", "#8265FF"],
    bell: ["#FF70D8", "#B64DFF", "#6484FF"],
    arrow: ["#64E9FF", "#4B9FFF", "#8265FF"],
  };

  const [c1, c2, c3] = palettes[name];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="5"
          y1="4"
          x2="58"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={c1} />
          <stop offset=".52" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>

        <linearGradient
          id={secondary}
          x1="10"
          y1="5"
          x2="52"
          y2="55"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" />
          <stop offset=".5" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>

        <filter
          id={`${gradient}-glow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter={`url(#${gradient}-glow)`}>
        {name === "rocket" && (
          <>
            <path
              d="M25 41C14 40 9 49 7 57C16 54 25 51 30 43"
              fill={c1}
              opacity=".8"
            />
            <path
              d="M23 35C18 27 24 17 35 9C43 3 53 4 57 5C58 18 54 30 46 39L35 50L23 35Z"
              fill={`url(#${gradient})`}
            />
            <path
              d="M33 13C39 8 46 7 52 8C53 15 51 22 47 28L33 13Z"
              fill="white"
              opacity=".22"
            />
            <circle
              cx="43"
              cy="20"
              r="6"
              fill="#11152D"
              stroke="white"
              strokeWidth="2.5"
            />
            <path
              d="M24 33L14 36L7 47L25 42"
              fill={c2}
            />
            <path
              d="M35 47L31 57L19 62L25 43"
              fill={c3}
            />
          </>
        )}

        {name === "send" && (
          <>
            <path
              d="M5 29L57 6L38 58L29 36L5 29Z"
              fill={`url(#${gradient})`}
            />
            <path
              d="M5 29L57 6L29 36L5 29Z"
              fill="white"
              opacity=".18"
            />
            <path
              d="M29 36L57 6L38 58L29 36Z"
              fill={c3}
              opacity=".65"
            />
            <path
              d="M12 45C8 49 7 53 7 57"
              stroke={c1}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}

        {name === "verified" && (
          <>
            <path
              d="M32 4L40 8L49 8L53 17L60 25L56 34L58 44L49 51L45 60L34 58L25 62L18 55L9 52L9 42L4 33L10 24L11 15L21 11L27 5L32 4Z"
              fill={`url(#${gradient})`}
            />
            <path
              d="M32 11L38 15L46 14L49 22L54 28L51 35L53 42L45 47L41 54L33 52L26 56L21 49L13 46L15 38L11 31L17 24L17 17L26 17L32 11Z"
              fill="#082B2A"
              opacity=".48"
            />
            <path
              d="M19 32L28 41L46 22"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {name === "interview" && (
          <>
            <rect
              x="7"
              y="12"
              width="50"
              height="46"
              rx="10"
              fill={`url(#${gradient})`}
            />
            <rect
              x="12"
              y="22"
              width="40"
              height="30"
              rx="5"
              fill="#17152D"
            />
            <path
              d="M18 7V18M46 7V18"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="33" r="6" fill={c1} />
            <path
              d="M21 49C21 41 25 38 32 38C39 38 43 41 43 49"
              fill={c2}
            />
          </>
        )}

        {name === "analytics" && (
          <>
            <path
              d="M7 55V42Q7 38 11 38H16Q20 38 20 42V55H7Z"
              fill={c1}
            />
            <path
              d="M25 55V29Q25 25 29 25H33Q37 25 37 29V55H25Z"
              fill={c2}
            />
            <path
              d="M42 55V15Q42 11 46 11H50Q54 11 54 15V55H42Z"
              fill={c3}
            />
            <path
              d="M7 32C20 26 33 19 49 5"
              stroke={`url(#${secondary})`}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M39 5H50V16"
              stroke={c1}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {name === "layers" && (
          <>
            <path
              d="M32 5L58 19L32 33L6 19L32 5Z"
              fill={c1}
            />
            <path
              d="M8 29L32 42L56 29L59 35L32 51L5 35L8 29Z"
              fill={c2}
            />
            <path
              d="M8 44L32 57L56 44L59 50L32 64L5 50L8 44Z"
              fill={c3}
            />
            <path
              d="M32 5L58 19L32 33L6 19L32 5Z"
              fill="white"
              opacity=".17"
            />
          </>
        )}

        {name === "compass" && (
          <>
            <circle cx="32" cy="32" r="26" fill={`url(#${gradient})`} />
            <circle cx="32" cy="32" r="19" fill="#11152D" />
            <path
              d="M43 18L36 36L18 46L27 28L43 18Z"
              fill={c1}
            />
            <path
              d="M43 18L36 36L27 28L43 18Z"
              fill="white"
              opacity=".55"
            />
          </>
        )}

        {name === "file" && (
          <>
            <path
              d="M15 5H37L52 20V55Q52 59 48 59H15Q11 59 11 55V9Q11 5 15 5Z"
              fill={`url(#${gradient})`}
            />
            <path
              d="M37 5V18Q37 20 40 20H52"
              fill={c2}
            />
            <path
              d="M20 32H42M20 41H42M20 50H35"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}

        {name === "calendar" && (
          <>
            <rect
              x="7"
              y="12"
              width="50"
              height="46"
              rx="9"
              fill={`url(#${gradient})`}
            />
            <rect
              x="12"
              y="23"
              width="40"
              height="29"
              rx="5"
              fill="#15152D"
            />
            <path
              d="M18 7V18M46 7V18"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M20 32H27M36 32H43M20 42H27"
              stroke={c1}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}

        {name === "zap" && (
          <path
            d="M36 4L12 36H29L24 60L53 25H35L36 4Z"
            fill={`url(#${gradient})`}
            stroke="white"
            strokeOpacity=".35"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}

        {name === "wallet" && (
          <>
            <rect
              x="6"
              y="14"
              width="52"
              height="40"
              rx="9"
              fill={`url(#${gradient})`}
            />
            <path
              d="M6 24H58"
              stroke="white"
              strokeOpacity=".35"
              strokeWidth="3"
            />
            <path
              d="M38 32H58V45H38Q32 45 32 39Q32 32 38 32Z"
              fill="#15152D"
            />
            <circle cx="42" cy="39" r="2.5" fill={c1} />
          </>
        )}

        {name === "clock" && (
          <>
            <circle cx="32" cy="32" r="26" fill={`url(#${gradient})`} />
            <circle cx="32" cy="32" r="19" fill="#15152D" />
            <path
              d="M32 19V33L42 39"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {name === "briefcase" && (
          <>
            <rect
              x="6"
              y="19"
              width="52"
              height="36"
              rx="8"
              fill={`url(#${gradient})`}
            />
            <path
              d="M23 19V13Q23 9 27 9H37Q41 9 41 13V19"
              stroke={c1}
              strokeWidth="4"
            />
            <path
              d="M6 31H58M27 31V36H37V31"
              stroke="white"
              strokeOpacity=".8"
              strokeWidth="3"
            />
          </>
        )}

        {name === "location" && (
          <>
            <path
              d="M32 60C25 49 10 35 10 24C10 12 19 4 32 4C45 4 54 12 54 24C54 35 39 49 32 60Z"
              fill={`url(#${gradient})`}
            />
            <circle cx="32" cy="24" r="9" fill="#11152D" />
            <circle cx="32" cy="24" r="4" fill={c1} />
          </>
        )}

        {name === "bell" && (
          <>
            <path
              d="M13 43H51L46 35V25C46 16 40 10 32 10C24 10 18 16 18 25V35L13 43Z"
              fill={`url(#${gradient})`}
            />
            <path
              d="M26 49C27 55 37 55 38 49"
              stroke={c1}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="49" cy="13" r="7" fill={c3} />
          </>
        )}

        {name === "arrow" && (
          <>
            <path
              d="M10 32H51M35 15L52 32L35 49"
              stroke={`url(#${gradient})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

/* -------------------------------------------------------
   STATUS COLORS
------------------------------------------------------- */

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

  if (
    value.includes("shortlist") ||
    value === "selected" ||
    value === "offered"
  ) {
    return "Shortlisted";
  }

  if (value.includes("interview")) return "Interview";

  if (value.includes("review") || value.includes("screen")) {
    return "Under Review";
  }

  if (value.includes("reject")) return "Rejected";

  return "Applied";
}

/* -------------------------------------------------------
   COMPANY MARK
------------------------------------------------------- */

const COMPANY_LOGOS: Record<number, string> = {
  1: "/company-logos/google.png",
  2: "/company-logos/microsoft.png",
  3: "/company-logos/amazon.png",
  4: "/company-logos/openai.png",
  5: "/company-logos/apple.png",
  6: "/company-logos/scaler.png",
  7: "/company-logos/razorpay.png",
  8: "/company-logos/atlassian.png",
  9: "/company-logos/crowdstrike.png",
  10: "/company-logos/intel.png",
  11: "/company-logos/adobe.png",
  12: "/company-logos/phonepe.png",
  13: "/company-logos/salesforce.png",
  14: "/company-logos/databricks.png",
  15: "/company-logos/cisco.png",
  16: "/company-logos/dettol.png",
};

function CompanyMark({
  companyId,
  name,
}: {
  companyId?: number;
  name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const logo = companyId ? COMPANY_LOGOS[companyId] : undefined;

  return (
    <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-purple-400/25 bg-white/[0.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(168,85,247,0.08)] transition duration-300 group-hover:border-fuchsia-400/45 group-hover:bg-white/[0.07]">
      {logo && !imageFailed ? (
        <img
          src={logo}
          alt={`${name} logo`}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/25 via-fuchsia-500/15 to-indigo-500/20 text-xl font-extrabold text-fuchsia-100">
          {initials || "IN"}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   SECTION TITLE
------------------------------------------------------- */

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: GradientIconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <GradientIcon
        name={icon}
        size={42}
        className="drop-shadow-[0_0_12px_rgba(190,80,255,0.3)]"
      />

      <div>
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

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
          name: `${authData.user.first_name || ""} ${
            authData.user.last_name || ""
          }`.trim(),
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
              Array.isArray(data.applications)
                ? data.applications
                : []
            );
          }
        }

        if (opportunityResponse.ok) {
          const data = await opportunityResponse.json();

          if (active) {
            setOpportunities(
              Array.isArray(data.opportunities)
                ? data.opportunities
                : []
            );
          }
        }

      } catch (error) {
        console.error("Dashboard loading failed:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
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

      chartOffset += total
        ? (item.value / total) * 100
        : 0;

      return `${statusColors[item.label.toLowerCase()]} ${start}% ${chartOffset}%`;
    })
    .join(", ");

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const statCards: {
    label: string;
    value: number;
    icon: GradientIconName;
    color: string;
    description: string;
  }[] = [
    {
      label: "Available Opportunities",
      value: opportunities.length,
      icon: "rocket",
      color: "fuchsia",
      description: "Explore available roles",
    },
    {
      label: "Applications Sent",
      value: total,
      icon: "send",
      color: "blue",
      description: "Your submitted applications",
    },
    {
      label: "Shortlisted",
      value: counts.Shortlisted,
      icon: "verified",
      color: "green",
      description: "Positive responses",
    },
    {
      label: "Interviews",
      value: counts.Interview,
      icon: "interview",
      color: "amber",
      description: "Interview opportunities",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070817] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-fuchsia-500/30 border-t-fuchsia-400 shadow-[0_0_24px_rgba(217,70,239,0.3)]" />

          <p className="text-sm font-medium text-slate-400">
            Preparing your InternHub workspace...
          </p>
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

      <StudentNavbar
        rightContent={
          <>
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-xl p-2 transition hover:bg-white/5"
            >
              <GradientIcon name="bell" size={24} />

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

              <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">
                {studentName}
              </span>

              <span className="text-xs text-slate-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-purple-500/30 bg-[#11152b]/95 p-2 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-3 py-3">
                  <p className="truncate text-sm font-semibold">
                    {studentName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {student?.email}
                  </p>
                </div>

                <Link
                  href="/applications"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  My Applications
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "include",
                      });
                    } finally {
                      router.replace("/login");
                      router.refresh();
                    }
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </>
        }
      />

      <div className="relative mx-auto max-w-[1700px] px-5 py-8 lg:px-10 lg:py-10">
        {/* Welcome */}
        <section className="mb-9 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_#d946ef]" />

              <p className="text-xs font-bold tracking-[0.28em] text-fuchsia-400">
                YOUR CAREER STARTS HERE
              </p>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[42px]">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
                {firstName}!
              </span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Track your applications, discover new opportunities, and
              manage your internship journey.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-purple-400/25 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-5 py-3.5 shadow-[0_0_28px_rgba(124,58,237,0.08)]">
            <GradientIcon name="calendar" size={28} />

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Today
              </p>

              <p className="text-sm font-semibold text-slate-200">
                {formattedDate}
              </p>
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
                  <div
                    className={`absolute -right-8 -top-10 h-32 w-32 rounded-full blur-[55px] ${
                      stat.color === "fuchsia"
                        ? "bg-fuchsia-500/20"
                        : stat.color === "blue"
                        ? "bg-blue-500/20"
                        : stat.color === "green"
                        ? "bg-emerald-500/20"
                        : "bg-amber-500/20"
                    }`}
                  />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center transition duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <GradientIcon
                        name={stat.icon}
                        size={57}
                        className="drop-shadow-[0_0_13px_rgba(190,80,255,0.35)]"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-3xl font-extrabold tracking-tight text-white">
                        {stat.value}
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                        {stat.label}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Stipend Intelligence entry point — detailed analytics live on its own page */}
            <Link
              href="/stipend-insights"
              className="group mb-7 flex flex-col justify-between gap-4 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-[#15122d]/95 via-[#101329] to-[#0b1021] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition hover:border-fuchsia-400/45 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] sm:flex-row sm:items-center sm:p-6"
            >
              <div className="flex items-center gap-4">
                <GradientIcon
                  name="analytics"
                  size={48}
                  className="drop-shadow-[0_0_13px_rgba(190,80,255,0.35)]"
                />
                <div>
                  <p className="text-base font-bold text-white">
                    Explore Stipend Intelligence
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Compare stipend trends, roles, companies and locations.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 self-start rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-bold text-fuchsia-200 transition group-hover:border-fuchsia-300/60 group-hover:bg-fuchsia-500/20 sm:self-auto">
                View Insights <span aria-hidden="true">→</span>
              </span>
            </Link>

            {/* Internship opportunities */}
            <section className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#15122d]/95 via-[#101329] to-[#0b1021] p-5 shadow-[0_0_45px_rgba(124,58,237,0.08)] sm:p-7">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <SectionTitle
                  icon="compass"
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
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
                    <GradientIcon name="briefcase" size={48} />
                  </div>

                  <p className="font-semibold text-slate-200">
                    No opportunities available right now.
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Check back later for new listings.
                  </p>
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

                    const stipendValue =
                      job.stipend === null || job.stipend === undefined || job.stipend === ""
                        ? null
                        : Number(job.stipend);

                    const deadlineLabel = job.deadline
                      ? new Date(job.deadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : null;

                    return (
                      <article
                        key={job.opportunity_id ?? index}
                        className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#15122d]/90 via-[#101329]/95 to-[#0b1021] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:shadow-[0_14px_38px_rgba(124,58,237,0.13)] sm:p-6"
                      >
                        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/[0.06] blur-3xl transition group-hover:bg-fuchsia-500/[0.11]" />

                        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)_auto] lg:items-center">
                          <div className="flex min-w-0 items-start gap-4">
                            <CompanyMark companyId={job.company_id} name={company} />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="max-w-full truncate font-bold text-white transition group-hover:text-fuchsia-200">
                                  {job.title || "Internship Opportunity"}
                                </h3>
                                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">
                                  {job.opportunity_type || "Opportunity"}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
                                <span className="font-medium text-slate-300">{company}</span>
                                {job.company_industry && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span>{job.company_industry}</span>
                                  </>
                                )}
                              </div>

                              {job.company_website && (
                                <a
                                  href={job.company_website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-purple-300/80 transition hover:text-fuchsia-200"
                                >
                                  {job.company_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                  <span aria-hidden="true">↗</span>
                                </a>
                              )}

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {skills.length > 0 ? (
                                  skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-100/90"
                                    >
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    Skills not specified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
                            <p className="flex min-w-0 items-center gap-2">
                              <GradientIcon name="location" size={20} />
                              <span className="truncate">
                                {job.company_location || "Location not specified"}
                              </span>
                            </p>

                            <p className="flex items-center gap-2">
                              <GradientIcon name="wallet" size={20} />
                              <span>
                                {stipendValue !== null && Number.isFinite(stipendValue)
                                  ? formatStipend(stipendValue)
                                  : "Stipend not specified"}
                              </span>
                            </p>

                            {deadlineLabel && (
                              <p className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
                                <GradientIcon name="calendar" size={20} />
                                <span>Apply by {deadlineLabel}</span>
                              </p>
                            )}
                          </div>

                          <Link
                            href="/recommendations"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/20 bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 text-center text-sm font-bold text-white shadow-[0_0_22px_rgba(168,85,247,0.2)] transition hover:-translate-y-0.5 hover:border-fuchsia-300/50 hover:brightness-110 hover:shadow-[0_0_28px_rgba(217,70,239,0.35)]"
                          >
                            Explore <span aria-hidden="true">→</span>
                          </Link>
                        </div>
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
                  icon="file"
                  title="Recent Applications"
                  subtitle="Your latest application activity"
                />

                <Link
                  href="/applications"
                  className="text-sm font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
                >
                  View All →
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
                  <p className="text-sm text-slate-300">
                    You haven't applied to any opportunities yet.
                  </p>

                  <Link
                    href="/recommendations"
                    className="mt-3 inline-block text-sm font-bold text-fuchsia-400 hover:text-fuchsia-300"
                  >
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                            <GradientIcon name="file" size={31} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {app.job_title || app.title || "Internship"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {app.company_name || app.company || "Company"}
                            </p>
                          </div>
                        </div>

                        <span
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                          style={{
                            borderColor: `${color}55`,
                            backgroundColor: `${color}15`,
                            color,
                          }}
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
              <SectionTitle
                icon="layers"
                title="Application Status"
                subtitle="Your application breakdown"
              />

              <div className="mt-7 flex flex-wrap items-center justify-center gap-6">
                <div
                  className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full shadow-[0_0_35px_rgba(168,85,247,0.13)]"
                  style={{
                    background:
                      total > 0
                        ? `conic-gradient(${chartGradient})`
                        : "conic-gradient(#29304a 0% 100%)",
                  }}
                >
                  <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#111329] shadow-inner">
                    <span className="text-4xl font-extrabold">
                      {total}
                    </span>

                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Total
                    </span>
                  </div>
                </div>

                <div className="min-w-[145px] flex-1 space-y-4">
                  {chartSegments
                    .filter((item) => item.label !== "Applied")
                    .map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <span
                            className="h-2.5 w-2.5 rounded-full shadow-sm"
                            style={{
                              backgroundColor:
                                statusColors[item.label.toLowerCase()],
                            }}
                          />

                          {item.label}
                        </span>

                        <span className="font-bold text-white">
                          {item.value}
                        </span>
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
              <SectionTitle
                icon="calendar"
                title="Upcoming Deadlines"
                subtitle="Keep track of important dates"
              />

              <div className="mt-5 rounded-2xl border border-dashed border-purple-400/20 bg-purple-500/[0.035] px-4 py-9 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
                  <GradientIcon name="clock" size={40} />
                </div>

                <p className="text-sm font-semibold text-slate-300">
                  No upcoming deadlines available.
                </p>

                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-slate-500">
                  Deadline information will appear here when provided by an
                  opportunity.
                </p>
              </div>
            </section>

            {/* Quick actions */}
            <section className="rounded-3xl border border-purple-500/25 bg-gradient-to-br from-[#17132f] to-[#0d1225] p-5 shadow-[0_0_30px_rgba(124,58,237,0.06)] sm:p-6">
              <SectionTitle
                icon="zap"
                title="Quick Actions"
                subtitle="Jump back into your journey"
              />

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  {
                    href: "/recommendations",
                    icon: "file" as const,
                    label: "Update Resume",
                  },
                  {
                    href: "/applications",
                    icon: "layers" as const,
                    label: "Applications",
                  },
                  {
                    href: "/recommendations",
                    icon: "compass" as const,
                    label: "Explore Jobs",
                  },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-purple-400/20 bg-gradient-to-b from-purple-500/10 to-blue-500/[0.04] p-3 text-center transition duration-200 hover:-translate-y-1 hover:border-fuchsia-400/50 hover:bg-purple-500/15 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                  >
                    <GradientIcon
                      name={action.icon}
                      size={34}
                      className="transition duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    />

                    <span className="text-[11px] font-semibold leading-4 text-slate-300 group-hover:text-white">
                      {action.label}
                    </span>
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
                  <p className="truncate font-bold text-white">
                    {studentName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {student?.email}
                  </p>
                </div>
              </div>

              <Link
                href="/profile"
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
