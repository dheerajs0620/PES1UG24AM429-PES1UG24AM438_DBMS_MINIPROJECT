
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useId,
  type ReactNode,
} from "react";
import Link from "next/link";
import StudentNavbar from "../../components/StudentNavbar";

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

function formatStipend(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

type Period = "all" | "6m";

type Summary = {
  total_opportunities: number;
  total_internships: number;
  total_projects: number;
  average_internship_stipend: number;
  highest_internship_stipend: number;
  lowest_internship_stipend: number;
  paid_opportunities: number;
  unpaid_opportunities: number;
  zero_stipend_opportunities: number;
  undisclosed_opportunities: number;
};

type Company = {
  company_id: number;
  company_name: string;
  total_opportunities: number;
  positive_stipend_listings: number;
  average_stipend: number;
  highest_stipend: number;
};

type Distribution = {
  opportunity_type: string;
  paid: number;
  unpaid: number;
  zero_stipend: number;
  undisclosed: number;
};

type RoleData = {
  role: string;
  opportunity_count: number;
  average_stipend: number;
  highest_stipend: number;
};

type CityData = {
  city: string;
  opportunity_count: number;
  average_stipend: number;
  highest_stipend: number;
};

type BracketData = {
  bracket: string;
  opportunity_count: number;
  percentage: number;
};

type TypeData = {
  opportunity_type: string;
  opportunity_count: number;
  average_stipend: number;
  paid_count: number;
  zero_stipend_count: number;
  undisclosed_count: number;
};

type Analytics = {
  success: boolean;
  period: string;
  summary: Summary;
  companies: Company[];
  distribution: Distribution[];
  byRole: RoleData[];
  byCity: CityData[];
  byBracket: BracketData[];
  byType: TypeData[];
  takeaways: string[];
  metrics?: {
    companies_represented: number;
    stipend_bracket_count: number;
    positive_internships: number;
    zero_stipend_internships: number;
    undisclosed_internships: number;
    positive_internship_percentage: number;
  };
  dataNotes?: {
    currency?: string;
    stipendPeriod?: string;
    roleSource?: string;
    citySource?: string;
    bracketScope?: string;
    periodSource?: string;
    defaultPeriod?: string;
    zeroStipendMeaning?: string;
    nullStipendMeaning?: string;
    companyRanking?: string;
    averageScope?: string;
  };
};

const COLORS = [
  "#C084FC",
  "#38BDF8",
  "#34D399",
  "#FBBF24",
  "#F472B6",
  "#818CF8",
  "#FB923C",
  "#2DD4BF",
];

const BRACKET_COLORS = [
  "#A855F7",
  "#0EA5E9",
  "#10B981",
  "#FBBF24",
  "#EC4899",
];

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatCompactINR(value: number) {
  const amount = Number(value) || 0;

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }

  return formatINR(amount);
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#15122d] via-[#101329] to-[#0b1021] p-5 shadow-[0_12px_45px_rgba(0,0,0,0.2)] transition duration-300 hover:border-fuchsia-400/40 ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-purple-600/[0.08] blur-3xl" />
      <div className="relative">{children}</div>
    </section>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 text-xl text-fuchsia-300">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* Redesigned KPI card: no decorative icons */
function KpiCard({
  label,
  value,
  description,
  accent,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  accent: string;
  icon: GradientIconName;
}) {
  return (
    <div className="group relative isolate overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#15122d]/95 via-[#101329] to-[#0b1021] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-400/45 hover:shadow-[0_0_32px_rgba(168,85,247,0.12)] sm:p-6">
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full opacity-[0.10] blur-[55px] transition-opacity duration-300 group-hover:opacity-25"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-4 break-words text-2xl font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-[2rem]">
            {value}
          </p>
          <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
            {description}
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center transition duration-300 group-hover:scale-110 group-hover:-rotate-3">
          <GradientIcon
            name={icon}
            size={54}
            className="drop-shadow-[0_0_13px_rgba(190,80,255,0.35)]"
          />
        </div>
      </div>
      <div className="relative mt-6 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full w-1/3 rounded-full transition-all duration-500 group-hover:w-2/3"
          style={{ background: `linear-gradient(90deg, ${accent}55, ${accent})` }}
        />
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-[10px] text-slate-500">{helper}</p>
    </div>
  );
}

function VerticalBarChart({ data }: { data: RoleData[] }) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item.average_stipend) || 0),
    1
  );

  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-500">
        No role-wise stipend data available yet.
      </div>
    );
  }

  return (
    <div className="w-full pt-2">
      <div className="flex h-[230px] w-full gap-2">
        <div className="flex h-[205px] shrink-0 flex-col justify-between pb-1 text-right text-[10px] text-slate-500">
          <span>{formatCompactINR(maxValue)}</span>
          <span>{formatCompactINR(maxValue * 0.75)}</span>
          <span>{formatCompactINR(maxValue * 0.5)}</span>
          <span>{formatCompactINR(maxValue * 0.25)}</span>
          <span>₹0</span>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[205px] flex-col justify-between">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="border-t border-white/[0.08]" />
            ))}
          </div>

          <div className="relative flex h-[205px] items-end justify-around gap-2 px-1">
            {data.map((item, index) => {
              const height = Math.max(
                3,
                (item.average_stipend / maxValue) * 100
              );
              const color = COLORS[index % COLORS.length];

              return (
                <div
                  key={item.role}
                  className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${item.role}: ${formatINR(
                    item.average_stipend
                  )} average; ${item.opportunity_count} listings; highest ${formatINR(
                    item.highest_stipend
                  )}`}
                >
                  <span className="mb-2 hidden whitespace-nowrap text-[10px] font-semibold text-slate-200 sm:block">
                    {formatCompactINR(item.average_stipend)}
                  </span>

                  <div
                    className="w-full max-w-[78px] rounded-t-md transition-all duration-500 group-hover:brightness-125"
                    style={{
                      height: `${height}%`,
                      minHeight: 5,
                      background: `linear-gradient(to top, ${color}88, ${color})`,
                      boxShadow: `0 0 20px ${color}30`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-3 grid gap-2 text-center"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
        }}
      >
        {data.map((item) => (
          <div
            key={item.role}
            className="min-w-0 text-[10px] font-medium text-slate-300 sm:text-xs"
            title={item.role}
          >
            <span className="block break-words">{item.role}</span>
            <span className="mt-1 block text-[9px] text-slate-500">
              n={item.opportunity_count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: BracketData[] }) {
  const total = data.reduce(
    (sum, item) => sum + (Number(item.opportunity_count) || 0),
    0
  );

  let runningTotal = 0;

  const segments = data.map((item, index) => {
    const start = runningTotal;

    runningTotal +=
      total > 0 ? (item.opportunity_count / total) * 100 : 0;

    return `${BRACKET_COLORS[index % BRACKET_COLORS.length]} ${start}% ${runningTotal}%`;
  });

  const gradient =
    total > 0
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#252b43 0% 100%)";

  return (
    <div className="flex flex-col items-center gap-7 py-2 sm:flex-row sm:justify-around">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: gradient,
            filter: "drop-shadow(0 0 18px rgba(168,85,247,0.15))",
          }}
        />

        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full border border-white/[0.07] bg-[#0d1225] text-center">
          <p className="text-2xl font-extrabold text-white">{total}</p>
          <p className="mt-1 text-xs text-slate-400">
            Paid internships
          </p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {data.length ? (
          data.map((item, index) => (
            <div
              key={item.bracket}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    background:
                      BRACKET_COLORS[index % BRACKET_COLORS.length],
                  }}
                />
                <span className="truncate text-xs text-slate-300">
                  {item.bracket}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">
                  {item.opportunity_count}
                </span>
                <span className="w-10 text-right text-xs font-bold text-white">
                  {Number(item.percentage).toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">
            No positive-stipend internship records in this period.
          </p>
        )}
      </div>
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  maxValue,
  count,
  index,
}: {
  label: string;
  value: number;
  maxValue: number;
  count: number;
  index: number;
}) {
  const color = COLORS[index % COLORS.length];
  const width =
    maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0;

  return (
    <div
      className="group"
      title={`${label}: ${formatINR(value)} average across ${count} positive-stipend internship listing(s)`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium text-slate-200 sm:text-sm">
          {label}
        </span>

        <div className="shrink-0 text-right">
          <span className="text-xs font-bold text-white sm:text-sm">
            {formatINR(value)}
          </span>
          <span className="ml-2 text-[10px] text-slate-500">
            ({count} listings)
          </span>
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#080d20]">
        <div
          className="h-full rounded-full transition-all duration-700 group-hover:brightness-125"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 15px ${color}45`,
          }}
        />
      </div>
    </div>
  );
}

function StatusPanel({
  title,
  subtitle,
  positive,
  zero,
  undisclosed,
  accent,
}: {
  title: string;
  subtitle: string;
  positive: number;
  zero: number;
  undisclosed: number;
  accent: string;
}) {
  const total = positive + zero + undisclosed;
  const positiveWidth = total ? (positive / total) * 100 : 0;
  const zeroWidth = total ? (zero / total) * 100 : 0;
  const undisclosedWidth = total
    ? (undisclosed / total) * 100
    : 0;

  return (
    <Panel>
      <SectionHeading
        icon={title === "Internship" ? "▣" : "◇"}
        title={`${title} Stipend Status`}
        subtitle={subtitle}
      />

      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-[#080d20]">
        {positive > 0 && (
          <div
            style={{
              width: `${positiveWidth}%`,
              background: accent,
            }}
            title={`Positive stipend: ${positive}`}
          />
        )}

        {zero > 0 && (
          <div
            style={{
              width: `${zeroWidth}%`,
              background: "#FBBF24",
            }}
            title={`Zero stipend: ${zero}`}
          />
        )}

        {undisclosed > 0 && (
          <div
            style={{
              width: `${undisclosedWidth}%`,
              background: "#94A3B8",
            }}
            title={`Undisclosed: ${undisclosed}`}
          />
        )}

        {total === 0 && <div className="w-full bg-slate-700" />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
          <p className="text-[11px] font-medium text-emerald-300">
            Positive stipend
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {positive}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
          <p className="text-[11px] font-medium text-amber-300">
            Zero stipend
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {zero}
          </p>
        </div>

        <div className="rounded-xl border border-slate-500/25 bg-slate-500/[0.06] p-3">
          <p className="text-[11px] font-medium text-slate-300">
            Undisclosed
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {undisclosed}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-5 text-slate-500">
        These categories describe stored stipend values. A zero value
        does not prove that an opportunity is unpaid.
      </p>
    </Panel>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "Internship") return <span>▣</span>;
  if (type === "Project") return <span>◇</span>;
  return <span>▤</span>;
}

export default function StipendInsightsPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [profileOpen, setProfileOpen] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/stipend-analytics?period=${period}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to load stipend analytics."
        );
      }

      setAnalytics(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = await response.json();

        if (!active) return;

        if (result.user) {
          const firstName = result.user.first_name || "";
          const lastName = result.user.last_name || "";

          setStudentName(
            `${firstName} ${lastName}`.trim() || "Student"
          );
        }
      } catch {
        // Analytics remain usable if the optional name lookup fails.
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const maxCityValue = useMemo(
    () =>
      Math.max(
        ...(analytics?.byCity || []).map(
          (item) => Number(item.average_stipend) || 0
        ),
        1
      ),
    [analytics]
  );

  const maxTypeValue = useMemo(
    () =>
      Math.max(
        ...(analytics?.byType || []).map(
          (item) => Number(item.average_stipend) || 0
        ),
        1
      ),
    [analytics]
  );

  const summary = analytics?.summary;
  const metrics = analytics?.metrics;

  const internshipDistribution =
    analytics?.distribution.find(
      (item) => item.opportunity_type === "Internship"
    ) ?? {
      opportunity_type: "Internship",
      paid: 0,
      unpaid: 0,
      zero_stipend: 0,
      undisclosed: 0,
    };

  const projectDistribution =
    analytics?.distribution.find(
      (item) => item.opportunity_type === "Project"
    ) ?? {
      opportunity_type: "Project",
      paid: 0,
      unpaid: 0,
      zero_stipend: 0,
      undisclosed: 0,
    };

  const internshipZero =
    internshipDistribution.zero_stipend ??
    internshipDistribution.unpaid ??
    0;

  const projectZero =
    projectDistribution.zero_stipend ??
    projectDistribution.unpaid ??
    0;

  const internshipUndisclosed =
    internshipDistribution.undisclosed ?? 0;

  const projectUndisclosed =
    projectDistribution.undisclosed ?? 0;

  const internshipRecordedTotal =
    Number(internshipDistribution.paid || 0) + Number(internshipZero || 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 h-[500px] w-[500px] rounded-full bg-purple-700/[0.10] blur-[150px]" />
        <div className="absolute -right-48 top-[400px] h-[500px] w-[500px] rounded-full bg-fuchsia-700/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-purple-700/[0.045] blur-[150px]" />
      </div>

      <StudentNavbar
        rightContent={
          <div className="relative flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-xl p-2 text-slate-300 transition hover:bg-white/5 hover:text-fuchsia-300"
            >
              <GradientIcon name="bell" size={24} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-[#070817]" />
            </button>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1.5 transition hover:border-purple-500/30 hover:bg-white/[0.04] sm:gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-300/60 bg-gradient-to-br from-purple-600 to-fuchsia-500 font-bold text-white shadow-[0_0_22px_rgba(168,85,247,0.35)]">
                {studentName.charAt(0).toUpperCase() || "S"}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-200 sm:block">
                {studentName}
              </span>
              <span className="text-xs text-slate-400">⌄</span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-48 rounded-xl border border-purple-500/30 bg-[#101329]/95 p-2 shadow-2xl backdrop-blur-xl">
                <Link
                  href="/profile"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-purple-500/15"
                  onClick={() => setProfileOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  href="/applications"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-purple-500/15"
                  onClick={() => setProfileOpen(false)}
                >
                  My Applications
                </Link>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={async () => {
                    setProfileOpen(false);
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "include",
                    });
                    window.location.href = "/login";
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Page content */}
      <div className="relative z-10 mx-auto max-w-[1700px] px-5 pb-12 pt-8 lg:px-10">
        {/* Page heading */}
        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-fuchsia-400">
              Stipend Intelligence
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Internship Stipend Insights
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Explore stipend trends, compare roles and locations,
              and make data-driven internship decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="period-filter" className="sr-only">
              Select analytics period
            </label>

            <select
              id="period-filter"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as Period)
              }
              className="min-h-11 min-w-44 rounded-xl border border-purple-500/40 bg-[#11152d] px-4 text-sm font-semibold text-slate-200 outline-none transition hover:border-fuchsia-400 focus:border-fuchsia-400"
            >
              <option value="all">All Time</option>
              <option value="6m">Last 6 Months</option>
            </select>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="min-h-11 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 text-sm font-semibold text-purple-200 transition hover:border-fuchsia-400 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
            <button
              type="button"
              onClick={loadAnalytics}
              className="ml-3 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !analytics ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-purple-500/20 border-t-fuchsia-400" />
              <p className="mt-4 text-sm text-slate-400">
                Calculating stipend insights from MySQL...
              </p>
            </div>
          </div>
        ) : analytics && summary ? (
          <>
            {/* Redesigned primary KPI cards */}
            <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Average Stipend"
                value={formatINR(summary.average_internship_stipend)}
                description="Across open internships"
                accent="#C084FC"
                icon="wallet"
              />

              <KpiCard
                label="Highest Stipend"
                value={formatINR(summary.highest_internship_stipend)}
                description="Highest listed internship amount"
                accent="#38BDF8"
                icon="zap"
              />

              <KpiCard
                label="Total Opportunities"
                value={summary.total_opportunities.toLocaleString("en-IN")}
                description={`${summary.total_internships} internships · ${summary.total_projects} projects`}
                accent="#A78BFA"
                icon="briefcase"
              />

              <KpiCard
                label="Positive-Stipend Internships"
                value={`${
                  metrics?.positive_internship_percentage ??
                  (internshipRecordedTotal > 0
                    ? Number(
                        (
                          (internshipDistribution.paid /
                            internshipRecordedTotal) *
                          100
                        ).toFixed(1)
                      )
                    : 0)
                }%`}
                description={`${internshipDistribution.paid} of ${internshipRecordedTotal} internships with recorded stipend values`}
                accent="#34D399"
                icon="verified"
              />
            </section>

            {/* Additional overview metrics */}
            <Panel className="mb-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SmallMetric
                  label="Open internships"
                  value={summary.total_internships}
                  helper="Internship listings"
                />

                <SmallMetric
                  label="Open projects"
                  value={summary.total_projects}
                  helper="Project listings"
                />

                <SmallMetric
                  label="Companies represented"
                  value={
                    metrics?.companies_represented ??
                    analytics.companies.length
                  }
                  helper="Companies with positive-stipend listings"
                />

                <SmallMetric
                  label="Stipend brackets"
                  value={
                    metrics?.stipend_bracket_count ??
                    analytics.byBracket.length
                  }
                  helper="Positive-stipend ranges"
                />
              </div>
            </Panel>

            {/* Main chart row */}
            <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
              <Panel>
                <SectionHeading
                  icon="▥"
                  title="Average Stipend by Role"
                  subtitle="Compare average disclosed internship stipends"
                />

                <VerticalBarChart data={analytics.byRole} />

                <p className="mt-4 text-[10px] leading-5 text-slate-500">
                  Roles are inferred from opportunity titles. The
                  &quot;Other&quot; category contains titles that do not
                  match the configured role patterns. Hover over a bar
                  for its detailed values.
                </p>
              </Panel>

              <Panel>
                <SectionHeading
                  icon="✣"
                  title="Stipend Distribution"
                  subtitle="Positive-stipend open internships grouped by range"
                />

                <DonutChart data={analytics.byBracket} />

                <p className="mt-4 text-[10px] leading-5 text-slate-500">
                  Only open internships with a stipend greater than
                  zero are included in these brackets. Zero and
                  undisclosed stipend records are excluded.
                </p>
              </Panel>
            </section>

            {/* Company leaderboard */}
            <Panel className="mb-5">
              <SectionHeading
                icon="▤"
                title="Top Companies by Stipend"
                subtitle="Compare average and highest listed internship stipends"
              />

              <div className="mb-4 rounded-xl border border-blue-400/15 bg-blue-400/[0.05] px-4 py-3">
                <p className="text-xs leading-5 text-slate-300">
                  <span className="font-bold text-blue-300">
                    How to read this ranking:
                  </span>{" "}
                  Companies are ranked by the average of their
                  positive-stipend open internship listings. The
                  listing count is shown as the sample size. A
                  company with one listing does not necessarily
                  represent its typical compensation.
                </p>
              </div>

              {analytics.companies.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-b border-purple-400/20 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="pb-4 pr-4 font-semibold">
                          Rank
                        </th>
                        <th className="pb-4 pr-4 font-semibold">
                          Company
                        </th>
                        <th className="pb-4 pr-4 font-semibold">
                          Sample size
                        </th>
                        <th className="pb-4 pr-4 font-semibold">
                          Average stipend
                        </th>
                        <th className="pb-4 font-semibold">
                          Highest stipend
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {analytics.companies.map((company, index) => (
                        <tr
                          key={company.company_id}
                          className="border-b border-white/[0.05] transition hover:bg-purple-500/[0.05]"
                        >
                          <td className="py-4 pr-4 text-xs text-slate-500">
                            {String(index + 1).padStart(2, "0")}
                          </td>

                          <td className="py-4 pr-4">
                            <span className="font-semibold text-white">
                              {company.company_name}
                            </span>
                          </td>

                          <td className="py-4 pr-4">
                            <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-3 py-1 text-xs font-semibold text-blue-200">
                              {company.positive_stipend_listings ??
                                company.total_opportunities}{" "}
                              listing(s)
                            </span>
                          </td>

                          <td className="py-4 pr-4 text-sm font-semibold text-violet-300">
                            {formatINR(company.average_stipend)}
                          </td>

                          <td className="py-4 text-sm font-semibold text-emerald-300">
                            {formatINR(company.highest_stipend)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No company stipend data available.
                </p>
              )}
            </Panel>

            {/* Location and opportunity type */}
            <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel>
                <SectionHeading
                  icon="⌖"
                  title="Stipend by Location"
                  subtitle="Average internship stipend by company location"
                />

                {analytics.byCity.length ? (
                  <div className="space-y-5">
                    {analytics.byCity.map((item, index) => (
                      <HorizontalBar
                        key={item.city}
                        label={item.city}
                        value={item.average_stipend}
                        maxValue={maxCityValue}
                        count={item.opportunity_count}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No location-based stipend data available.
                  </p>
                )}

                <p className="mt-5 text-[10px] leading-5 text-slate-500">
                  Listing counts are shown beside each average. A
                  location with fewer listings may not represent the
                  wider market. Locations come from company records.
                </p>
              </Panel>

              <Panel>
                <SectionHeading
                  icon="◇"
                  title="Stipend by Opportunity Type"
                  subtitle="Compare internship and project records"
                />

                <div className="space-y-4">
                  {analytics.byType.map((item) => {
                    const color =
                      item.opportunity_type === "Internship"
                        ? "#C084FC"
                        : "#38BDF8";

                    const average = Number(item.average_stipend) || 0;
                    const width =
                      maxTypeValue > 0
                        ? (average / maxTypeValue) * 100
                        : 0;

                    return (
                      <div
                        key={item.opportunity_type}
                        className="rounded-xl border border-purple-400/20 bg-[#0b1022] p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg"
                              style={{
                                color,
                                borderColor: `${color}44`,
                                background: `${color}15`,
                              }}
                            >
                              <TypeIcon type={item.opportunity_type} />
                            </span>

                            <div>
                              <p className="text-sm font-bold text-white">
                                {item.opportunity_type}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {item.opportunity_count} open listings
                              </p>
                            </div>
                          </div>

                          <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200">
                            {formatINR(average)}
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#080d20]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${width}%`,
                              background: `linear-gradient(90deg, ${color}88, ${color})`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                          <span className="text-emerald-300">
                            Positive: {item.paid_count}
                          </span>

                          <span className="text-amber-300">
                            Zero: {item.zero_stipend_count}
                          </span>

                          <span className="text-slate-400">
                            Undisclosed: {item.undisclosed_count}
                          </span>
                        </div>

                        <p className="mt-3 text-[10px] text-slate-500">
                          Average is calculated using positive
                          stipend values only.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </section>

            {/* Separate stipend status panels */}
            <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <StatusPanel
                title="Internship"
                subtitle="Positive, zero and undisclosed internship stipend values"
                positive={internshipDistribution.paid}
                zero={internshipZero}
                undisclosed={internshipUndisclosed}
                accent="#10B981"
              />

              <StatusPanel
                title="Project"
                subtitle="Positive, zero and undisclosed project stipend values"
                positive={projectDistribution.paid}
                zero={projectZero}
                undisclosed={projectUndisclosed}
                accent="#FBBF24"
              />
            </section>

            {/* Key takeaways */}
            <Panel className="mb-5">
              <SectionHeading
                icon="✧"
                title="Key Takeaways"
                subtitle="Insights generated from the currently selected dataset"
              />

              {analytics.takeaways.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {analytics.takeaways.map((item, index) => (
                    <div
                      key={`${index}-${item}`}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] text-xs text-emerald-300">
                        ✓
                      </span>

                      <p className="text-xs leading-6 text-slate-200">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Not enough data to generate takeaways.
                </p>
              )}
            </Panel>

            {/* Methodology */}
            <Panel>
              <SectionHeading
                icon="ⓘ"
                title="About These Figures"
                subtitle="Understand how the analytics are calculated"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Currency",
                    value: analytics.dataNotes?.currency || "INR",
                  },
                  {
                    label: "Stipend period",
                    value:
                      analytics.dataNotes?.stipendPeriod ||
                      "Not specified in database",
                  },
                  {
                    label: "Role classification",
                    value:
                      analytics.dataNotes?.roleSource ||
                      "Inferred from opportunity titles",
                  },
                  {
                    label: "Location source",
                    value:
                      analytics.dataNotes?.citySource ||
                      "Companies.location",
                  },
                  {
                    label: "Time filter",
                    value:
                      analytics.dataNotes?.periodSource ||
                      "Opportunities.created_at",
                  },
                  {
                    label: "Selected period",
                    value:
                      period === "all" ? "All time" : "Last 6 months",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-2 break-words text-xs font-medium leading-5 text-slate-300">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-purple-400/20 bg-purple-500/[0.05] p-4">
                <p className="text-xs font-bold text-fuchsia-300">
                  Data interpretation
                </p>

                <p className="mt-2 text-[11px] leading-6 text-slate-400">
                  A zero stipend does not establish whether an
                  opportunity is unpaid or undisclosed. A NULL
                  stipend is treated separately as undisclosed.
                  Stipend amounts are displayed as stored in the
                  database; the database does not specify whether
                  they are monthly, annual or total compensation.
                  Role categories are inferred from opportunity
                  titles, while location comparisons use company
                  location records. Average stipend calculations
                  use positive stipend values only.
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-blue-400/15 bg-blue-400/[0.04] p-4">
                <p className="text-xs font-bold text-blue-300">
                  Ranking and sample-size note
                </p>

                <p className="mt-2 text-[11px] leading-6 text-slate-400">
                  Company and location comparisons are based on
                  the available positive-stipend internship
                  listings in the selected period. Always consider
                  the number of listings alongside the average.
                  A result based on one listing is not necessarily
                  representative of an entire company or location.
                </p>
              </div>
            </Panel>
          </>
        ) : !error ? (
          <Panel>
            <div className="py-16 text-center">
              <p className="text-lg font-bold text-white">
                No stipend analytics available
              </p>

              <p className="mt-2 text-sm text-slate-400">
                There are currently no open opportunities in this
                selected period.
              </p>

              <button
                type="button"
                onClick={loadAnalytics}
                className="mt-5 rounded-xl border border-purple-400/30 bg-purple-500/10 px-5 py-2.5 text-sm font-bold text-purple-200 hover:bg-purple-500/20"
              >
                Try again
              </button>
            </div>
          </Panel>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-500/20 px-5 py-6">
        <div className="mx-auto flex max-w-[1700px] flex-col justify-between gap-2 text-[10px] text-slate-500 sm:flex-row">
          <span>InternHub · Stipend Intelligence</span>

          <span>
            {period === "all" ? "All-time" : "Last 6 months"} ·
            Database-driven analytics
          </span>
        </div>
      </footer>
    </main>
  );
}
