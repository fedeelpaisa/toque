"use client";

import type React from "react";
import { useState } from "react";
import { PlaneTakeoff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md bg-ink p-2 text-white">
            <PlaneTakeoff size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Logistica de viajes</h1>
            <p className="text-sm text-muted">Acceso operativo interno</p>
          </div>
        </div>

        {!hasEnv && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Falta configurar Supabase en <strong>.env.local</strong>.
          </div>
        )}

        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="field mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

        <label className="label mt-4 block" htmlFor="password">Password</label>
        <input id="password" className="field mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />

        {message && <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}

        <button className="focus-ring mt-6 w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading || !hasEnv}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
