"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm text-[#1f1e30] placeholder:text-[#999999] outline-none disabled:opacity-50";

const iconClass =
  "material-symbols-outlined text-[22px] leading-none text-[#777777]";

const fieldClass =
  "flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#EEEEEE] bg-white px-4 transition-colors focus-within:border-[#1f1e30]";

const primaryButtonClass =
  "flex h-[54px] w-full items-center justify-center rounded-xl bg-[#B7FE1A] text-sm font-semibold text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50";

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

      if (
        profileError ||
        !profile?.role ||
        !["Admin", "Project Manager", "Staff"].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        setError(
          "Role akun tidak valid atau tidak ditemukan. Hubungi administrator.",
        );
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-10 text-[#1f1e30]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0"
      />

      <section className="w-full max-w-[440px]">
        {/* LOGO */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/enika%20logo%20hitam.png"
            alt="Enika"
            width={150}
            height={52}
            priority
            className="h-auto w-[130px] object-contain object-center"
          />
        </div>

        {/* CARD LOGIN */}
        <div className="w-full rounded-[22px] border border-[#EEEEEE] bg-white p-6 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8">
          {/* HEADER */}
          <div className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1f1e30] sm:text-[32px]">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm leading-5 text-[#777777]">
              Masuk untuk mengelola proyek dan memantau progres pekerjaan.
            </p>
          </div>

          {/* FORM LOGIN */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="w-full break-words rounded-xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-3 text-sm text-[#57534E]"
              >
                {error}
              </div>
            )}

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
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                  disabled={loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#777777] transition-colors hover:text-[#1f1e30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FE1A] disabled:cursor-not-allowed"
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

            {/* LUPA PASSWORD */}
            <div className="flex justify-end pt-1">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
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
      </section>
    </main>
  );
}
