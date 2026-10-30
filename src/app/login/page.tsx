"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:!text-zinc-500 outline-none disabled:opacity-50";

const iconClass =
  "material-symbols-outlined text-[22px] leading-none text-zinc-400";

const fieldClass =
  "flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 transition-colors focus-within:border-[#B7FE1A]";

const primaryButtonClass =
  "flex h-[54px] w-full items-center justify-center rounded-xl bg-[#B7FE1A] text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("Email atau password salah.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile?.role) {
        await supabase.auth.signOut();
        setError("Data role akun tidak ditemukan. Hubungi administrator.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0"
      />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[60%_40%]">
        {/* PANEL KIRI */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            {/* LOGO */}
            <div className="mb-8">
              <Image
                src="/images/enika%20logo.png"
                alt="Enika"
                width={120}
                height={42}
                priority
                className="h-auto w-[110px] object-contain object-left"
              />
            </div>

            {/* CARD LOGIN */}
            <div className="w-full rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-6 sm:p-8">
              {/* HEADER */}
              <div className="mb-7">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[32px]">
                  Welcome Back
                </h1>

                <p className="mt-2 text-sm leading-5 text-zinc-400">
                  Masuk untuk mengelola proyek dan memantau progres pekerjaan.
                </p>
              </div>

              {/* FORM LOGIN */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* EMAIL */}
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>

                  <div className={fieldClass}>
                    <span
                      className={`${iconClass} flex shrink-0 items-center justify-center`}
                      aria-hidden="true"
                    >
                      mail
                    </span>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan email"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>

                  <div className={fieldClass}>
                    <span
                      className={`${iconClass} flex shrink-0 items-center justify-center`}
                      aria-hidden="true"
                    >
                      lock
                    </span>

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      aria-pressed={showPassword}
                      disabled={loading}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-[#B7FE1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FE1A] disabled:cursor-not-allowed"
                    >
                      <span
                        className={`${iconClass} flex translate-y-[1px] items-center justify-center`}
                        aria-hidden="true"
                      >
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* ERROR */}
                {error && (
                  <div
                    role="alert"
                    className="w-full break-words rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </div>
                )}

                {/* LUPA PASSWORD */}
                <div className="flex justify-end pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#B7FE1A] transition-colors hover:text-[#caff57]"
                  >
                    Lupa password?
                  </Link>
                </div>

                {/* TOMBOL LOGIN */}
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* PANEL KANAN */}
        <aside className="relative hidden min-h-screen overflow-hidden lg:block">
          <Image
            src="/images/laptop%20bg.png"
            alt="Enika website mockup"
            fill
            priority
            sizes="40vw"
            className="object-cover object-center"
          />
        </aside>
      </div>
    </main>
  );
}
