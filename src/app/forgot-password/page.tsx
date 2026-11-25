
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Step = "email" | "otp" | "password" | "success";

const OTP_DURATION_SECONDS = 5 * 60;

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm text-[#1f1e30] placeholder:text-[#999999] outline-none disabled:opacity-50";

const iconClass =
  "material-symbols-outlined text-[22px] leading-none text-[#777777]";

const fieldClass =
  "flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#EEEEEE] bg-white px-4 transition-colors focus-within:border-[#1f1e30]";

const primaryButtonClass =
  "flex h-[54px] w-full items-center justify-center rounded-xl bg-[#B7FE1A] text-sm font-semibold text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50";

const backLinkClass =
  "text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]";

const successButtonClass =
  "flex h-[54px] w-full cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] text-sm font-semibold text-[#1f1e30] transition-colors hover:bg-[#a8ed12]";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function ForgotPasswordPage() {
  const supabase = createClient();

  // Preview halaman sukses. Kembalikan ke "email" setelah selesai mengecek.
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
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpExpired = step === "otp" && secondsLeft <= 0;

  useEffect(() => {
    if (step !== "otp" || otpExpiresAt === null) return;

    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((otpExpiresAt! - Date.now()) / 1000),
      );

      setSecondsLeft(remaining);
    }

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [step, otpExpiresAt]);

  function startOtpCountdown() {
    const expiresAt = Date.now() + OTP_DURATION_SECONDS * 1000;

    setOtpExpiresAt(expiresAt);
    setSecondsLeft(OTP_DURATION_SECONDS);
  }

  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        console.error("Send recovery OTP error:", error);
        setError(`Gagal mengirim kode: ${error.message}`);
        return;
      }

      setToken("");
      startOtpCountdown();
      setMessage("");
      setStep("otp");
    } catch (err) {
      console.error("Unexpected recovery error:", err);

      setError(
        err instanceof Error
          ? `Terjadi kesalahan: ${err.message}`
          : "Terjadi kesalahan yang tidak diketahui.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resending || loading || secondsLeft > 0) return;

    setError("");
    setMessage("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) throw error;

      setToken("");
      startOtpCountdown();
      setMessage("");

      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (err) {
      console.error("Resend recovery OTP error:", err);

      setError("Gagal mengirim ulang kode verifikasi. Silakan coba lagi.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    setError("");

    if (otpExpired) return;

    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setToken((current) => {
        const next = current.padEnd(6, " ").split("");

        next[index] = " ";

        return next.join("").trimEnd();
      });

      return;
    }

    if (digits.length > 1) {
      const pastedDigits = digits.slice(0, 6).split("");

      setToken(pastedDigits.join(""));

      otpRefs.current[Math.min(pastedDigits.length, 5)]?.focus();

      return;
    }

    setToken((current) => {
      const next = current.padEnd(6, " ").split("");

      next[index] = digits[0];

      return next.join("").trimEnd();
    });

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (otpExpired) return;

    if (e.key === "Backspace") {
      e.preventDefault();

      if (token[index]) {
        setToken((current) => {
          const next = current.padEnd(6, " ").split("");

          next[index] = " ";

          return next.join("").trimEnd();
        });
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();

        setToken((current) => {
          const next = current.padEnd(6, " ").split("");

          next[index - 1] = " ";

          return next.join("").trimEnd();
        });
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (secondsLeft <= 0) {
      setError("Kode verifikasi telah kedaluwarsa. Silakan kirim ulang kode.");
      return;
    }

    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setError("Masukkan kode verifikasi 6 digit.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "recovery",
      });

      if (error) throw error;

      setOtpExpiresAt(null);
      setSecondsLeft(0);
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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOtpExpiresAt(null);
    setSecondsLeft(0);
    setError("");
    setMessage("");
  }

  function renderPasswordToggle(
    visible: boolean,
    toggle: () => void,
    label: string,
  ) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={visible}
        disabled={loading}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#777777] transition-colors hover:text-[#1f1e30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FE1A] disabled:cursor-not-allowed"
      >
        <span
          className={`${iconClass} flex items-center justify-center`}
          aria-hidden="true"
        >
          {visible ? "visibility" : "visibility_off"}
        </span>
      </button>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-10 text-[#1f1e30]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0"
      />

      <style jsx global>{`
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }

        input::-webkit-credentials-auto-fill-button {
          visibility: hidden;
          display: none !important;
          pointer-events: none;
        }

        @keyframes draw-check {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes success-icon-pop {
          0% {
            opacity: 0;
            transform: scale(0.82);
          }
          70% {
            opacity: 1;
            transform: scale(1.06);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .success-icon-pop {
          animation: success-icon-pop 450ms ease-out both;
        }

        .success-check-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-check 650ms 250ms ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .success-icon-pop,
          .success-check-draw {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }
      `}</style>

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

        {/* CARD FORGOT PASSWORD */}
        <div className="w-full rounded-[22px] border border-[#EEEEEE] bg-white p-6 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8">
          <div className={`mb-7 ${step === "success" ? "text-center" : ""}`}>
            {/* ICON SUCCESS */}
            {step === "success" && (
              <div className="flex justify-center pb-5 pt-1">
                <div className="success-icon-pop flex h-20 w-20 items-center justify-center rounded-full border border-[#B7FE1A]/40 bg-[#B7FE1A]/10">
                  <svg
                    viewBox="0 0 48 48"
                    className="h-11 w-11"
                    fill="none"
                    role="img"
                    aria-label="Berhasil"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="17"
                      stroke="#1f1e30"
                      strokeWidth="2.8"
                    />
                    <path
                      d="M15.5 24.5L21.5 30.5L33 18"
                      stroke="#1f1e30"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="100"
                      className="success-check-draw"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* TITLE */}
            <h1 className={`text-3xl font-semibold tracking-tight text-[#1f1e30] sm:text-[32px] ${step === "success" ? "text-center" : ""}`} >
              {step === "success"
                ? "Password Berhasil Diubah"
                : step === "otp"
                  ? "Verifikasi Email"
                  : step === "password"
                    ? "Buat Password Baru"
                    : "Lupa Password?"}
            </h1>

            {/* DESCRIPTION */}
            <p className={`mt-2 text-sm leading-5 text-[#777777] ${step === "success" ? "text-center" : ""}`}>
              {step === "email" &&
                "Masukkan email yang terdaftar untuk menerima kode verifikasi reset password."}

              {step === "otp" &&
                "Masukkan 6 digit kode verifikasi yang telah dikirim ke email kamu."}

              {step === "password" &&
                "Buat password baru untuk mengamankan akun kamu."}

              {step === "success" &&
                "Password akun kamu sudah berhasil diperbarui. Silakan masuk menggunakan password baru."}
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="mb-5 w-full break-words rounded-xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-3 text-sm text-[#57534E]"
            >
              {error}
            </div>
          )}

          {/* MESSAGE */}
          {message && (
            <div
              role="status"
              className="mb-5 w-full break-words rounded-xl border border-[#d9efad] bg-[#f5ffe5] px-4 py-3 text-sm leading-5 text-[#527a13]"
            >
              {message}
            </div>
          )}

          {/* EMAIL STEP */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="w-full space-y-4">
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

          {/* OTP STEP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="w-full space-y-5">
              <div>
                <div className="flex w-full justify-between gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      aria-label={`Digit OTP ${index + 1}`}
                      value={token[index] ?? ""}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onFocus={(e) => e.currentTarget.select()}
                      maxLength={6}
                      required
                      disabled={loading || otpExpired}
                      className="h-[54px] min-w-0 flex-1 rounded-xl border border-[#EEEEEE] bg-white text-center text-xl font-semibold text-[#1f1e30] outline-none transition-colors focus:border-[#1f1e30] disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpExpired || token.length !== 6}
                className={primaryButtonClass}
              >
                {loading ? "Memverifikasi..." : "Verifikasi Kode"}
              </button>

              <div className="pt-1 text-center text-sm leading-6">
                {secondsLeft > 0 ? (
                  <p className="text-[#777777]">
                    Tidak menerima kode?{" "}
                    <span className="text-[#999999]">Kirim ulang dalam </span>
                    <span className="font-medium tabular-nums text-[#1f1e30]">
                      {formatTime(secondsLeft)}
                    </span>
                  </p>
                ) : (
                  <p className="text-[#777777]">
                    Tidak menerima kode?{" "}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading || resending}
                      className="font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resending ? "Mengirim..." : "Kirim ulang kode"}
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* NEW PASSWORD STEP */}
          {step === "password" && (
            <form onSubmit={handleUpdatePassword} className="w-full space-y-4">
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
                    className={`${inputClass} appearance-none`}
                  />

                  {renderPasswordToggle(
                    showPassword,
                    () => setShowPassword((prev) => !prev),
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password",
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
                    className={`${inputClass} appearance-none`}
                  />

                  {renderPasswordToggle(
                    showConfirmPassword,
                    () => setShowConfirmPassword((prev) => !prev),
                    showConfirmPassword
                      ? "Sembunyikan konfirmasi password"
                      : "Tampilkan konfirmasi password",
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

          {/* SUCCESS BUTTON */}
          {step === "success" && (
            <Link href="/login" className={successButtonClass}>
              Kembali ke Login
            </Link>
          )}

          {/* BACK LINK */}
          {step !== "success" && (
            <div className="mt-6 text-center">
              {step === "email" ? (
                <Link href="/login" className={backLinkClass}>
                  Kembali ke Login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className={`${backLinkClass} cursor-pointer`}
                >
                  Kembali
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
