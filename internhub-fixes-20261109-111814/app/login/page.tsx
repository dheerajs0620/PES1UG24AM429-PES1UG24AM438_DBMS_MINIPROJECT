"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
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
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "Invalid email or password.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b14] px-5 py-12 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-purple-700/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-7 top-7 flex items-center gap-2 text-xl font-extrabold tracking-tight"
      >
        <span className="text-3xl text-purple-400">8</span>
        InternHub
      </Link>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1120] shadow-2xl shadow-purple-950/30 md:grid-cols-2">
        
        {/* Left promotional panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#211044] via-[#17112e] to-[#0d1120] p-12 md:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-purple-400/20" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full border border-purple-400/20" />

          <div className="relative z-10">
            <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold tracking-wider text-purple-300">
              YOUR CAREER STARTS HERE
            </span>

            <h1 className="mt-10 text-4xl font-extrabold leading-tight">
              Find opportunities.
              <br />
              <span className="text-purple-400">Show your potential.</span>
            </h1>

            <p className="mt-6 max-w-sm leading-7 text-gray-300">
              Sign in to discover internships, get AI-powered skill matches,
              and manage your career journey in one place.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-purple-400/20 bg-white/[0.04] p-5">
            <div className="mb-3 text-3xl text-purple-300">?</div>
            <p className="text-sm leading-6 text-gray-300">
              Your skills have potential. Let InternHub help you find the
              opportunities where they matter.
            </p>
            <p className="mt-4 text-xs font-semibold text-purple-300">
              INTERNHUB · SMARTER CAREER DISCOVERY
            </p>
          </div>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-9">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-purple-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-extrabold tracking-tight">
                Sign in to InternHub
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Enter your credentials to access your account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

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
                    className="text-xs font-medium text-purple-400 transition hover:text-purple-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3.5 pr-20 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-400 hover:text-purple-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3.5 font-bold text-white shadow-lg shadow-purple-900/30 transition hover:scale-[1.01] hover:from-purple-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In ?"}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-500">NEW TO INTERNHUB?</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-purple-400 transition hover:text-purple-300"
              >
                Create an account
              </Link>
            </p>

            <Link
              href="/"
              className="mt-8 block text-center text-xs text-gray-500 transition hover:text-gray-300"
            >
              ? Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
