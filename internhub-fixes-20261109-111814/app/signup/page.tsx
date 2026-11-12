"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to create your account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b14] px-5 py-10 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-purple-700/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />

      {/* Brand */}
      <Link
        href="/"
        className="absolute left-7 top-7 z-20 flex items-center gap-2 text-xl font-extrabold tracking-tight"
      >
        <span className="text-3xl text-purple-400">8</span>
        InternHub
      </Link>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1120] shadow-2xl shadow-purple-950/30 md:grid-cols-2">

        {/* Left promotional panel - same as Login */}
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
              <span className="text-purple-400">
                Show your potential.
              </span>
            </h1>

            <p className="mt-6 max-w-sm leading-7 text-gray-300">
              Create your account to discover internships, get AI-powered
              skill matches, and manage your career journey in one place.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-purple-400/20 bg-white/[0.04] p-5">
            <div className="mb-3 text-3xl text-purple-300">?</div>

            <p className="text-sm leading-6 text-gray-300">
              Your skills have potential. Let InternHub help you find the
              opportunities where they matter.
            </p>

            <p className="mt-4 text-xs font-semibold text-purple-300">
              INTERNHUB - SMARTER CAREER DISCOVERY
            </p>
          </div>
        </section>

        {/* Signup form */}
        <section className="flex items-center justify-center px-7 py-10 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-purple-400">
                Get started
              </p>

              <h2 className="text-3xl font-extrabold tracking-tight">
                Create your account
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Start your internship journey with InternHub.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First and last name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    First name
                  </label>

                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={handleChange}
                    className={inputStyle}
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    Last name
                  </label>

                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={handleChange}
                    className={inputStyle}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={inputStyle}
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    className={`${inputStyle} pr-20`}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-400 transition hover:text-purple-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={`${inputStyle} pr-20`}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-400 transition hover:text-purple-300"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3.5 font-bold text-white shadow-lg shadow-purple-900/30 transition hover:scale-[1.01] hover:from-purple-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-500">
                ALREADY A MEMBER?
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-purple-400 transition hover:text-purple-300"
              >
                Sign in
              </Link>
            </p>

            <Link
              href="/"
              className="mt-7 block text-center text-xs text-gray-500 transition hover:text-gray-300"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}