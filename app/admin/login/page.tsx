"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, role: "SUPER_ADMIN" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to sign in.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b14] px-5 py-12 text-white">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-700/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-purple-600/15 blur-[120px]" />
      <Link href="/" className="absolute left-7 top-7 flex items-center gap-2 text-xl font-extrabold tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/50 bg-purple-500/10 text-2xl text-purple-300">✣</span>InternHub</Link>
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-purple-400/20 bg-[#0d1120] p-8 shadow-2xl shadow-purple-950/30 sm:p-10">
        <div className="mb-8"><span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">Restricted access</span><h1 className="mt-6 text-3xl font-extrabold">Super Admin</h1><p className="mt-3 text-sm leading-6 text-gray-400">Sign in with your provisioned administrator credentials. Admin accounts cannot be created from public signup.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-200">Admin email</label><input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" /></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-200">Password</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3.5 pr-20 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-300">{showPassword ? "Hide" : "Show"}</button></div></div>
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:opacity-60">{loading ? "Verifying..." : "Secure Admin Sign In"}</button>
        </form>
        <Link href="/login" className="mt-7 block text-center text-sm text-gray-400 hover:text-white">← Back to student / company login</Link>
      </section>
    </main>
  );
}
