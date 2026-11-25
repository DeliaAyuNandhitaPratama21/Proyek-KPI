"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type DeleteUserButtonProps = {
  userId: string;
  action: (formData: FormData) => Promise<void>;
};

export function DebouncedUserSearch({
  initialSearch,
  deleted = false,
}: {
  initialSearch: string;
  deleted?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [deleteSuccess, setDeleteSuccess] = useState("");

  useEffect(() => {
    setSearchInput(initialSearch);
  }, [initialSearch]);

  // Setelah server mengonfirmasi penghapusan dan daftar diperbarui,
  // scroll ke atas terlebih dahulu sebelum menampilkan notifikasi.
  useEffect(() => {
    if (!deleted) return;

    let finished = false;
    let fallbackTimeout: number | undefined;

    const showNotification = () => {
      if (finished) return;
      finished = true;

      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout);
      }
      window.removeEventListener("scrollend", showNotification);
      setDeleteSuccess("Pengguna berhasil dihapus.");

      // Hapus parameter deleted agar notifikasi tidak muncul lagi saat refresh,
      // sambil mempertahankan parameter pencarian yang sedang aktif.
      const params = new URLSearchParams(window.location.search);
      params.delete("deleted");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    };

    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fallback untuk browser yang belum mendukung event scrollend.
    fallbackTimeout = window.setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout);
      }
      window.removeEventListener("scrollend", showNotification);
    };
  }, [deleted, pathname, router]);

  // Notifikasi hilang otomatis setelah 3 detik.
  useEffect(() => {
    if (!deleteSuccess) return;

    const timeout = window.setTimeout(() => setDeleteSuccess(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [deleteSuccess]);

  useEffect(() => {
    const keyword = searchInput.trim();
    if (keyword === initialSearch.trim()) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (keyword) params.set("q", keyword);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [searchInput, initialSearch, pathname, router]);

  return (
    <div className="w-full">
      {deleteSuccess && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
        >
          <span>{deleteSuccess}</span>
        </div>
      )}

      <div className="group flex w-full items-center gap-2 rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(31,30,48,0.04)] transition-colors focus-within:border-[#1f1e30] md:max-w-sm">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-[#777777] transition-colors group-focus-within:text-[#1f1e30]"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Cari pengguna..."
          className="w-full min-w-0 bg-transparent text-sm text-[#1f1e30] outline-none placeholder:text-[#999999] [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />

        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Hapus pencarian"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-[#777777] transition-colors hover:text-[#1f1e30]"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function DeleteUserButton({
  userId,
  action,
}: DeleteUserButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await action(formData);
          setShowConfirm(false);
        });
      }}
      className="inline"
    >
      <input type="hidden" name="userId" value={userId} />

      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowConfirm(true)}
        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Hapus
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (!isPending) setShowConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1ffcc] text-[#1f1e30]">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>

            <h2
              id="delete-user-title"
              className="mt-5 text-center text-lg font-semibold text-[#1f1e30]"
            >
              Hapus Pengguna?
            </h2>

            <p className="mx-auto mt-4 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]">
              Apakah kamu yakin ingin menghapus pengguna ini? Akun yang sudah
              dihapus tidak dapat dipulihkan.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowConfirm(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1f1e30] px-5 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
