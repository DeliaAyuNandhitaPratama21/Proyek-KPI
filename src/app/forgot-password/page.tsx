
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Step = "email" | "otp" | "password" | "success";

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:!text-zinc-500 outline-none disabled:opacity-50";

const iconClass =
  "material-symbols-outlined text-[22px] leading-none text-zinc-400";

const fieldClass =
  "flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 transition-colors focus-within:border-[#B7FE1A]";

const primaryButtonClass =
  "flex h-[54px] w-full items-center justify-center rounded-xl bg-[#B7FE1A] text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );

      if (error) throw error;

      setMessage("Kode verifikasi telah dikirim ke email kamu.");
      setStep("otp");
    } catch {
      setError("Gagal mengirim kode verifikasi. Periksa email dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );

      if (error) throw error;

      setMessage("Kode verifikasi telah dikirim ulang. Periksa email kamu.");
    } catch {
      setError("Gagal mengirim ulang kode verifikasi. Silakan coba lagi.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "recovery",
      });

      if (error) throw error;

      setStep("password");
    } catch {
      setError("Kode verifikasi tidak valid atau sudah kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setStep("success");
    } catch {
      setError("Gagal mengubah password. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  function goBackToEmail() {
    setStep("email");
    setToken("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }

  function renderPasswordToggle(
    visible: boolean,
    toggle: () => void,
    label: string
  ) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={visible}
        disabled={loading}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-[#B7FE1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FE1A] disabled:cursor-not-allowed"
      >
        <span
          className={`${iconClass} flex translate-y-[1px] items-center justify-center`}
          aria-hidden="true"
        >
          {visible ? "visibility" : "visibility_off"}
        </span>
      </button>
    );
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

            {/* CARD FORGOT PASSWORD */}
            <div className="w-full rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-6 sm:p-8">
              {/* HEADER */}
              <div className="mb-7">
                {step === "success" && (
                  <div className="flex justify-start pb-5 pt-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#B7FE1A]/30 bg-[#B7FE1A]/10">
                      <span
                        className={`${iconClass} !text-3xl !text-[#B7FE1A]`}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                    </div>
                  </div>
                )}

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[32px]">
                  {step === "success"
                    ? "Password Berhasil Diubah"
                    : step === "otp"
                      ? "Verifikasi Email"
                      : step === "password"
                        ? "Buat Password Baru"
                        : "Lupa Password?"}
                </h1>

                <p className="mt-2 text-sm leading-5 text-zinc-400">
                  {step === "email" &&
                    "Masukkan email yang terdaftar untuk menerima kode verifikasi reset password."}
                  {step === "otp" &&
                    "Masukkan kode verifikasi yang telah dikirim ke email kamu."}
                  {step === "password" &&
                    "Buat password baru untuk mengamankan akun kamu."}
                  {step === "success" &&
                    "Password akun kamu sudah berhasil diperbarui. Silakan masuk menggunakan password baru."}
                </p>
              </div>

              {/* PESAN ERROR DAN SUKSES */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 w-full break-words rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mb-5 w-full break-words rounded-xl border border-[#B7FE1A]/20 bg-[#B7FE1A]/[0.05] px-4 py-3 text-sm leading-5 text-[#c9e6a0]"
                >
                  {message}
                </div>
              )}

              {/* STEP 1: EMAIL */}
              {step === "email" && (
                <form
                  onSubmit={handleSendCode}
                  className="w-full space-y-4"
                >
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

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading ? "Mengirim..." : "Kirim Kode"}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP */}
              {step === "otp" && (
                <form
                  onSubmit={handleVerifyOtp}
                  className="w-full space-y-4"
                >
                  <div>
                    <label htmlFor="otp" className="sr-only">
                      Kode Verifikasi
                    </label>

                    <div className={fieldClass}>
                      <span
                        className={`${iconClass} flex shrink-0 items-center justify-center`}
                        aria-hidden="true"
                      >
                        pin
                      </span>

                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Masukkan kode verifikasi"
                        required
                        disabled={loading}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading ? "Memverifikasi..." : "Verifikasi Kode"}
                  </button>

                  <div className="pt-2 text-center text-sm">
                    <span className="text-zinc-400">
                      Tidak menerima kode?{" "}
                    </span>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading || resending}
                      className="font-medium text-[#B7FE1A] transition-colors hover:text-[#caff57] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resending ? "Mengirim..." : "Kirim ulang"}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: PASSWORD BARU */}
              {step === "password" && (
                <form
                  onSubmit={handleUpdatePassword}
                  className="w-full space-y-4"
                >
                  <div>
                    <label htmlFor="password" className="sr-only">
                      Password Baru
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
                        placeholder="Masukkan password baru"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        disabled={loading}
                        className={inputClass}
                      />

                      {renderPasswordToggle(
                        showPassword,
                        () => setShowPassword((prev) => !prev),
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="sr-only">
                      Konfirmasi Password
                    </label>

                    <div className={fieldClass}>
                      <span
                        className={`${iconClass} flex shrink-0 items-center justify-center`}
                        aria-hidden="true"
                      >
                        lock
                      </span>

                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        disabled={loading}
                        className={inputClass}
                      />

                      {renderPasswordToggle(
                        showConfirmPassword,
                        () => setShowConfirmPassword((prev) => !prev),
                        showConfirmPassword
                          ? "Sembunyikan konfirmasi password"
                          : "Tampilkan konfirmasi password"
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading ? "Menyimpan..." : "Ubah Password"}
                  </button>
                </form>
              )}

              {/* STEP 4: BERHASIL */}
              {step === "success" && (
                <Link
                  href="/login"
                  className={`${primaryButtonClass} `}
                >
                  Kembali ke Login
                </Link>
              )}

              {/* KEMBALI KE LOGIN */}
              {step !== "success" && (
                <div className="mt-6 text-center">
                  {step === "email" ? (
                    <Link
                      href="/login"
                      className="text-sm text-zinc-400 transition-colors hover:text-[#B7FE1A]"
                    >
                      Kembali ke Login
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={goBackToEmail}
                      className="text-sm text-zinc-400 transition-colors hover:text-[#B7FE1A]"
                    >
                      Kembali
                    </button>
                  )}
                </div>
              )}
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
