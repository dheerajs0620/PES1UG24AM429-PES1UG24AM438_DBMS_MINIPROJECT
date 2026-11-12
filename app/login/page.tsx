
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AccountType = "STUDENT" | "COMPANY";

function getSafeRedirectPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
  ) {
    return next;
  }

  return null;
}

export default function LoginPage() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<AccountType>("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your login identifier and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          identifier: email.trim(),
          password,
          role: accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to sign in. Please try again."
        );
      }

      const requestedDestination = getSafeRedirectPath();

      const defaultDestination =
        accountType === "COMPANY" ? "/company" : "/dashboard";

      // Keep redirects within the selected account's area.
      const allowedDestination =
        requestedDestination &&
        (accountType === "COMPANY"
          ? requestedDestination.startsWith("/company")
          : requestedDestination.startsWith("/dashboard") ||
            requestedDestination.startsWith("/recommendations"));

      const destination = allowedDestination
        ? requestedDestination
        : defaultDestination;

      if (data.message && data.message !== "Login successful.") {
        setMessage(data.message);
      }

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-[#090711]/90 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20";

  const labelStyle =
    "mb-2 block text-sm font-semibold text-gray-200";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07060b] px-5 py-10 text-white">
      {/* Ambient theme lighting */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-fuchsia-700/15 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-violet-700/20 blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/10 blur-[150px]" />

      {/* Brand */}
      <Link
        href="/"
        className="absolute left-7 top-7 z-20 flex items-center gap-2.5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-3xl font-bold text-fuchsia-300 shadow-lg shadow-fuchsia-900/20">
          ∞
        </span>
        <span className="text-xl font-extrabold tracking-tight">
          Intern<span className="text-fuchsia-400">Hub</span>
        </span>
      </Link>

      {/* Main card */}
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c0a13]/90 shadow-2xl shadow-purple-950/40 backdrop-blur-2xl md:grid-cols-2">
        {/* Left promotional panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#24102e] via-[#171020] to-[#0c0a13] p-12 md:flex">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full border border-fuchsia-400/15" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full border border-purple-400/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border border-purple-400/20" />
          <div className="pointer-events-none absolute bottom-10 left-10 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-[90px]" />

          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold tracking-widest text-fuchsia-300">
              WELCOME TO INTERNHUB
            </span>

            <h1 className="mt-10 text-4xl font-extrabold leading-tight">
              Your next opportunity
              <br />
              starts <span className="text-fuchsia-400">here.</span>
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-7 text-gray-300">
              Discover internships, showcase your skills, and connect
              with opportunities that match your potential.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-fuchsia-400/20 bg-black/30 p-6 backdrop-blur-xl">
            <div className="mb-3 text-3xl font-bold text-fuchsia-300">
              ∞
            </div>

            <p className="text-sm leading-6 text-gray-300">
              A smarter way to connect emerging talent with
              meaningful career opportunities.
            </p>

            <p className="mt-5 text-xs font-bold tracking-widest text-fuchsia-300">
              INTERNHUB · SMARTER CAREER DISCOVERY
            </p>
          </div>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-extrabold tracking-tight">
                Sign in to InternHub
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Select your account type and continue.
              </p>
            </div>

            {/* Account type selector */}
            <div className="mb-7 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-1.5">
              {(["STUDENT", "COMPANY"] as AccountType[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setAccountType(item);
                      setError("");
                      setMessage("");
                      setEmail("");
                    }}
                    className={`rounded-lg px-3 py-3 text-sm font-bold transition-all duration-200 ${
                      accountType === item
                        ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-900/30"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item === "STUDENT" ? "Student" : "Company"}
                  </button>
                )
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Login identifier */}
              <div>
                <label htmlFor="email" className={labelStyle}>
                  {accountType === "STUDENT"
                    ? "Email address or PES SRN"
                    : "Email address"}
                </label>

                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    accountType === "STUDENT"
                      ? "Enter email or PES SRN"
                      : "company@example.com"
                  }
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={inputStyle}
                />

                {accountType === "STUDENT" && (
                  <p className="mt-2 text-xs text-gray-500">
                    You can sign in using your registered email
                    address or university SRN.
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-200"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-fuchsia-400 transition hover:text-fuchsia-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`${inputStyle} pr-20`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Status message */}
              {message && (
                <div
                  role="status"
                  className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-amber-200"
                >
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3.5 font-bold text-white shadow-lg shadow-purple-900/30 transition duration-200 hover:scale-[1.01] hover:from-fuchsia-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing in..."
                  : `Sign in as ${
                      accountType === "STUDENT" ? "Student" : "Company"
                    }`}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
              >
                Create account
              </Link>
            </p>

            <Link
              href="/"
              className="mt-6 block text-center text-xs text-gray-500 transition hover:text-gray-300"
            >
              ← Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
