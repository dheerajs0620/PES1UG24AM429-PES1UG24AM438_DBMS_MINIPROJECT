"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Internships", href: "/recommendations" },
  { label: "My Applications", href: "/applications" },
];

export default function StudentNavbar({
  rightContent,
}: {
  rightContent?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-purple-500/25 bg-[#070817]/95 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1700px] items-center justify-between gap-5 px-5 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/60 bg-purple-500/10 text-2xl text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
            ?
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            Intern<span className="text-fuchsia-400">Hub</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 py-[27px] text-sm transition-all duration-200 ${
                  active
                    ? "border-fuchsia-500 font-semibold text-white"
                    : "border-transparent text-slate-400 hover:border-fuchsia-400/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {rightContent && (
          <div className="relative flex shrink-0 items-center">
            {rightContent}
          </div>
        )}
      </div>

      <nav className="flex gap-6 overflow-x-auto border-t border-white/5 px-5 py-3 lg:hidden">
        {links.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap text-sm transition ${
                active
                  ? "font-semibold text-fuchsia-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
