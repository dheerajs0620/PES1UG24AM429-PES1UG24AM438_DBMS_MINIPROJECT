
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AccountType = "STUDENT" | "COMPANY";

export default function SignupPage() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<AccountType>("STUDENT");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    srn: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    industry: "",
    website: "",
    location: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: name === "srn" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    if (accountType === "STUDENT") {
      const normalizedSrn = form.srn.trim().toUpperCase();

      if (!/^PES1UG\d{2}[A-Z]{2}\d{3}$/.test(normalizedSrn)) {
        setError(
          "Enter a valid PES SRN, for example PES1UG24AM438."
        );
        return;
      }
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (accountType === "COMPANY" && !form.companyName.trim()) {
      setError("Please enter your company name.");
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
          accountType,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,

          ...(accountType === "STUDENT"
            ? {
                srn: form.srn.trim().toUpperCase(),
              }
            : {
                companyName: form.companyName,
                industry: form.industry,
                website: form.website,
                location: form.location,
              }),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to create your account."
        );
      }

      router.push(
        accountType === "COMPANY" ? "/company" : "/dashboard"
      );
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
      {/* Ambient background lighting */}
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

      {/* Signup card */}
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c0a13]/90 shadow-2xl shadow-purple-950/40 backdrop-blur-2xl md:grid-cols-2">
        {/* Left promotional panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#24102e] via-[#171020] to-[#0c0a13] p-12 md:flex">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full border border-fuchsia-400/15" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full border border-purple-400/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border border-purple-400/20" />
          <div className="pointer-events-none absolute bottom-10 left-10 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-[90px]" />

          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold tracking-widest text-fuchsia-300">
              YOUR CAREER STARTS HERE
            </span>

            <h1 className="mt-10 text-4xl font-extrabold leading-tight">
              Find opportunities.
              <br />
              <span className="text-fuchsia-400">
                Show your potential.
              </span>
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-7 text-gray-300">
              Join InternHub to discover internships, connect with
              talent, and manage opportunities in one place.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-fuchsia-400/20 bg-black/30 p-6 backdrop-blur-xl">
            <div className="mb-3 text-3xl font-bold text-fuchsia-300">
              ∞
            </div>

            <p className="text-sm leading-6 text-gray-300">
              One platform connecting emerging talent with
              meaningful opportunities.
            </p>

            <p className="mt-5 text-xs font-bold tracking-widest text-fuchsia-300">
              INTERNHUB · SMARTER CAREER DISCOVERY
            </p>
          </div>
        </section>

        {/* Signup form */}
        <section className="flex items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
                Get started
              </p>

              <h2 className="text-3xl font-extrabold tracking-tight">
                Create your account
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Choose how you want to use InternHub.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className={labelStyle}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    required
                    maxLength={50}
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    autoComplete="given-name"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className={labelStyle}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    required
                    maxLength={50}
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Student SRN */}
              {accountType === "STUDENT" && (
                <div>
                  <label htmlFor="srn" className={labelStyle}>
                    PES University SRN
                  </label>

                  <input
                    id="srn"
                    name="srn"
                    type="text"
                    required
                    maxLength={13}
                    value={form.srn}
                    onChange={handleChange}
                    placeholder="PES1UG24AM438"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={inputStyle}
                  />

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Enter your official university SRN. You can use
                    your SRN or email address to sign in later.
                  </p>
                </div>
              )}

              {/* Company-specific fields */}
              {accountType === "COMPANY" && (
                <>
                  <div>
                    <label htmlFor="companyName" className={labelStyle}>
                      Company name *
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      required
                      maxLength={100}
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="Your company name"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label htmlFor="industry" className={labelStyle}>
                      Industry
                    </label>
                    <input
                      id="industry"
                      name="industry"
                      maxLength={100}
                      value={form.industry}
                      onChange={handleChange}
                      placeholder="e.g. Technology, Healthcare"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className={labelStyle}>
                      Company website
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      maxLength={150}
                      value={form.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className={labelStyle}>
                      Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      maxLength={100}
                      value={form.location}
                      onChange={handleChange}
                      placeholder="City, Country"
                      className={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelStyle}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={100}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelStyle}>
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
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

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className={labelStyle}
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={`${inputStyle} pr-20`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Company approval notice */}
              {accountType === "COMPANY" && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs leading-6 text-amber-200">
                  Company accounts require Super Admin approval
                  before internships can be published.
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3.5 font-bold text-white shadow-lg shadow-purple-900/30 transition duration-200 hover:scale-[1.01] hover:from-fuchsia-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Creating account..."
                  : `Create ${
                      accountType === "STUDENT" ? "Student" : "Company"
                    } Account`}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-fuchsia-400 transition hover:text-fuchsia-300"
              >
                Sign in
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
