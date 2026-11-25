
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type ProjectsSearchProps = {
  search: string;
};

export function ProjectsSearch({ search }: ProjectsSearchProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(search);

  // Sinkronkan input ketika parameter URL berubah.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Server-side search otomatis dengan debounce 500 ms.
  useEffect(() => {
    const keyword = searchInput.trim();

    if (keyword === search) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();

      if (keyword) {
        params.set("search", keyword);
      }

      const queryString = params.toString();
      const url = queryString
        ? `${pathname}?${queryString}`
        : pathname;

      router.replace(url, { scroll: false });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput, search, pathname, router]);

  return (
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
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Cari proyek..."
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
  );
}

type ProjectActionsProps = {
  projectId: number | string;
  projectName: string;
  canDelete: boolean;
  canArchive: boolean;
};

type DialogAction = "archive" | "delete" | null;

// Notifikasi aksi proyek ditampilkan oleh halaman daftar proyek.
export function ProjectDeleteNotification({
  initialMessage = "",
}: {
  initialMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingNotification, setPendingNotification] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState("");
  const [message, setMessage] = useState("");
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    if (initialMessage) {
      setQueuedMessage(initialMessage);
      setPendingNotification(true);
    }
  }, [initialMessage]);

  // Tampilkan notifikasi setelah proyek berhasil ditambahkan atau diperbarui.
  // Parameter URL dihapus agar notifikasi tidak muncul lagi saat halaman di-refresh.
  useEffect(() => {
    const created = searchParams.get("created") === "1";
    const updated = searchParams.get("updated") === "1";

    if (!created && !updated) return;

    setQueuedMessage(
      created ? "Proyek berhasil ditambahkan." : "Proyek berhasil diperbarui.",
    );
    setPendingNotification(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("created");
    params.delete("updated");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    function handleProjectActionSuccess(event: Event) {
      const customEvent = event as CustomEvent<{ message?: string }>;

      setQueuedMessage(customEvent.detail?.message || "Aksi proyek berhasil.");
      setPendingNotification(true);

      // Perbarui daftar proyek terlebih dahulu.
      startTransition(() => {
        router.refresh();
      });
    }

    window.addEventListener("project-action-success", handleProjectActionSuccess);
    window.addEventListener("project-delete-success", handleProjectActionSuccess);

    return () => {
      window.removeEventListener("project-action-success", handleProjectActionSuccess);
      window.removeEventListener("project-delete-success", handleProjectActionSuccess);
    };
  }, [router]);

  useEffect(() => {
    if (!pendingNotification || isRefreshing) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setPendingNotification(false);
      setMessage(queuedMessage || "Proyek berhasil dihapus.");
      setQueuedMessage("");
    };

    // Jika sudah di paling atas, tidak perlu menunggu proses scroll.
    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    // Notifikasi baru muncul setelah scroll ke atas selesai.
    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fallback untuk browser yang belum mendukung event scrollend.
    fallbackTimeout = setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [pendingNotification, isRefreshing, queuedMessage]);

  useEffect(() => {
    if (!message || pendingNotification) return;

    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [message, pendingNotification]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
    >
      <span>{message}</span>
    </div>
  );
}

export default function ProjectActions({
  projectId,
  projectName,
  canDelete,
  canArchive,
}: ProjectActionsProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const isProcessing = deleting || archiving;
  const isArchive = dialogAction === "archive";

  function openDialog(action: Exclude<DialogAction, null>) {
    if (isProcessing) return;
    setErrorMessage("");
    setDialogAction(action);
  }

  async function handleArchive() {
    if (archiving || deleting || !canArchive) return;

    setArchiving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data: archivedProject, error } = await supabase
        .from("projects")
        .update({
          is_archived: true,
          archived_by_client: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("is_archived", false)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Gagal mengarsipkan proyek:", error);
        setErrorMessage(`Gagal mengarsipkan proyek: ${error.message}`);
        return;
      }

      if (!archivedProject) {
        setErrorMessage(
          "Proyek tidak ditemukan atau kamu tidak memiliki izin untuk mengarsipkannya.",
        );
        return;
      }

      setDialogAction(null);
      window.dispatchEvent(
        new CustomEvent("project-action-success", {
          detail: { message: "Proyek berhasil diarsipkan." },
        }),
      );
    } catch (error) {
      console.error("Terjadi kesalahan saat mengarsipkan proyek:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengarsipkan proyek.",
      );
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (deleting || archiving || !canDelete) return;

    setDeleting(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data: deletedProject, error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select("id, project_name, client_id")
        .maybeSingle();

      if (error) {
        console.error("Gagal menghapus proyek:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        setErrorMessage(
          `${error.message}${error.details ? ` Detail: ${error.details}` : ""}`,
        );
        return;
      }

      if (!deletedProject) {
        setErrorMessage(
          "Proyek tidak ditemukan atau kamu tidak memiliki izin untuk menghapusnya.",
        );
        return;
      }

      // Riwayat penghapusan dicatat otomatis oleh trigger database.
      // Komponen notifikasi akan memperbarui daftar, scroll ke atas,
      // lalu menampilkan notifikasi setelah scroll selesai.
      setDialogAction(null);
      window.dispatchEvent(
        new CustomEvent("project-delete-success", {
          detail: { message: "Proyek berhasil dihapus." },
        }),
      );
    } catch (error) {
      console.error("Terjadi kesalahan saat menghapus proyek:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus proyek.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          {/* EDIT */}
          <Link
            href={`/dashboard/projects/${projectId}/edit`}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
          >
            Edit
          </Link>

          {/* ARSIPKAN */}
          {canArchive && (
            <button
              type="button"
              onClick={() => openDialog("archive")}
              disabled={isProcessing}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#D97706] bg-[#feefd2] px-3 py-1.5 text-sm font-normal text-[#D97706] transition-colors hover:bg-[#f9e4bd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Arsipkan
            </button>
          )}

          {/* HAPUS */}
          {canDelete && (
            <button
              type="button"
              onClick={() => openDialog("delete")}
              disabled={isProcessing}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        </div>

        {!dialogAction && errorMessage && (
          <p role="alert" className="max-w-xs text-xs text-red-700">
            {errorMessage}
          </p>
        )}
      </div>

      {/* POPUP KONFIRMASI */}
      {dialogAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setDialogAction(null);
              setErrorMessage("");
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-description"
            className="w-full max-w-sm rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
            {/* IKON */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1FFCC]">
              {isArchive ? (
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
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                  <path d="M10 12h4" />
                </svg>
              ) : (
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
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="m19 6-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              )}
            </div>

            {/* JUDUL DAN DESKRIPSI */}
            <div className="mt-5 text-center">
              <h2
                id="confirmation-title"
                className="text-lg font-semibold text-[#1f1e30]"
              >
                {isArchive ? "Arsipkan Proyek?" : "Hapus Proyek?"}
              </h2>

              <p
                id="confirmation-description"
                className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]"
              >
                {isArchive ? (
                  <>
                    Apakah kamu yakin ingin mengarsipkan proyek{" "}
                    <span className="font-semibold text-[#1f1e30]">
                      {projectName}
                    </span>
                    ? Proyek akan dipindahkan ke Arsip Proyek dan seluruh datanya
                    tetap tersimpan.
                  </>
                ) : (
                  <>
                    Apakah kamu yakin ingin menghapus proyek{" "}
                    <span className="font-semibold text-[#1f1e30]">
                      {projectName}
                    </span>
                    ? Proyek yang dihapus tidak dapat dipulihkan, tetapi data klien tetap aman.
                  </>
                )}
              </p>

              {/* ERROR DI DALAM POPUP */}
              {errorMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-600"
                >
                  {errorMessage}
                </p>
              )}
            </div>

            {/* TOMBOL */}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setDialogAction(null);
                  setErrorMessage("");
                }}
                disabled={isProcessing}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-[500] [font-family:inherit] text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={isArchive ? handleArchive : handleDelete}
                disabled={isProcessing}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-4 text-sm font-[600] [font-family:inherit] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing
                  ? isArchive
                    ? "Mengarsipkan..."
                    : "Menghapus..."
                  : isArchive
                    ? "Ya, Arsipkan"
                    : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
