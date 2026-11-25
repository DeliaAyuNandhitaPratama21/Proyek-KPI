
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError("Logout gagal. Silakan coba lagi.");
        return;
      }

      setShowConfirm(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan saat logout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* TOMBOL LOGOUT */}
      <div>
        {error && !showConfirm && (
          <p role="alert" className="px-3 pb-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowConfirm(true);
          }}
          disabled={loading}
          className="group flex w-full items-center gap-3 rounded-xl bg-[#B7FE1A]/10 px-4 py-3 text-left text-[13px] font-medium text-[#B7FE1A] transition-all duration-200 hover:border-[#B7FE1A]/40 hover:bg-[#B7FE1A] hover:text-[#111800] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className="material-symbols-outlined text-[19px]"
            aria-hidden="true"
          >
            logout
          </span>

          <span>Logout</span>
        </button>
      </div>

      {/* POPUP KONFIRMASI LOGOUT */}
      {mounted &&
        showConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !loading) {
                setShowConfirm(false);
                setError("");
              }
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-confirmation-title"
              aria-describedby="logout-confirmation-description"
              className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
            >
              {/* IKON */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1FFCC]">
                <svg
                  width="27"
                  height="27"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1f1e30"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                </svg>
              </div>

              {/* JUDUL DAN DESKRIPSI */}
              <div className="mt-5 text-center">
                <h2
                  id="logout-confirmation-title"
                  className="text-lg font-semibold text-[#1f1e30]"
                >
                  Keluar dari Akun?
                </h2>

                <p
                  id="logout-confirmation-description"
                  className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]"
                >
                  Apakah kamu yakin ingin keluar dari akun Enika Project
                  Management?
                </p>

                {/* ERROR DI DALAM POPUP */}
                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-600"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* TOMBOL */}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-[500] [font-family:inherit] text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-4 text-sm font-[600] [font-family:inherit] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging out..." : "Ya, Logout"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
