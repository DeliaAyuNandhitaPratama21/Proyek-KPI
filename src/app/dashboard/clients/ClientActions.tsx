
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { createActivityLog } from "../../../lib/activity-log";

type ClientActionsProps = {
  clientId: number;
  companyName: string;
  canDelete: boolean;
  onDeleted: () => void;
  onArchived: () => void;
};

type DialogAction = "archive" | "delete" | null;

export default function ClientActions({
  clientId,
  companyName,
  canDelete,
  onDeleted,
  onArchived,
}: ClientActionsProps) {
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);

  async function handleArchive() {
    if (!canDelete) {
      setErrorMessage("Hanya Admin yang dapat mengarsipkan klien.");
      setDialogAction(null);
      return;
    }

    setArchiving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("archive_client_with_projects", {
        p_client_id: clientId,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Activity log bersifat best-effort:
      // kegagalannya tidak membatalkan proses pengarsipan.
      try {
        const { error: logError } = await createActivityLog({
          action: "ARCHIVE_CLIENT",
          description: `Mengarsipkan klien ${companyName} beserta proyek aktifnya`,
          metadata: {
            client_id: clientId,
            company_name: companyName,
            status: "Archived",
          },
        });

        if (logError) {
          console.error("Gagal mencatat activity log:", logError);
        }
      } catch (logError) {
        console.error("Gagal mencatat activity log:", logError);
      }

      setDialogAction(null);
      onArchived();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengarsipkan klien."
      );
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      setErrorMessage("Hanya Admin yang dapat menghapus klien.");
      setDialogAction(null);
      return;
    }

    setDeleting(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { count, error: projectError } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);

      if (projectError) {
        throw new Error(
          "Gagal memeriksa proyek milik klien. Silakan coba lagi."
        );
      }

      if ((count ?? 0) > 0) {
        throw new Error(
          "Klien tidak bisa dihapus karena masih memiliki proyek. Arsipkan klien jika sudah tidak aktif."
        );
      }

      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .select("id, company_name")
        .single();

      if (error) {
        console.error("Gagal menghapus klien:", error);

        throw new Error(
          "Klien gagal dihapus. Periksa hak akses atau relasi data klien."
        );
      }

      // Activity log bersifat best-effort:
      // kegagalannya tidak membatalkan proses penghapusan.
      try {
        const { error: logError } = await createActivityLog({
          action: "DELETE_CLIENT",
          description: `Menghapus klien ${data.company_name}`,
          metadata: {
            client_id: data.id,
            company_name: data.company_name,
          },
        });

        if (logError) {
          console.error("Gagal mencatat activity log:", logError);
        }
      } catch (logError) {
        console.error("Gagal mencatat activity log:", logError);
      }

      setDialogAction(null);
      onDeleted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus klien."
      );
    } finally {
      setDeleting(false);
    }
  }

  const isArchive = dialogAction === "archive";
  const isProcessing = archiving || deleting;

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          {/* EDIT */}
          <Link
            href={`/dashboard/clients/${clientId}/edit`}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#65A30D] bg-[#f1ffcc] px-3 py-1.5 text-sm font-normal text-[#65A30D] transition-colors hover:bg-[#e7f7b8]"
          >
            Edit
          </Link>

          {/* ARSIPKAN */}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setDialogAction("archive");
              }}
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
              onClick={() => {
                setErrorMessage("");
                setDialogAction("delete");
              }}
              disabled={isProcessing}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#DC2626] bg-[#fce2d3] px-3 py-1.5 text-sm font-normal text-[#DC2626] transition-colors hover:bg-[#f7d3c1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        </div>

        {errorMessage && !dialogAction && (
          <p role="alert" className="max-w-xs text-xs text-red-500">
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
                {isArchive ? "Arsipkan Klien?" : "Hapus Klien?"}
              </h2>

              <p
                id="confirmation-description"
                className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-[#777777] [text-wrap:balance]"
              >
                {isArchive ? (
                  <>
                    Apakah kamu yakin ingin mengarsipkan klien{" "}
                    <span className="font-semibold text-[#1f1e30]">
                      {companyName}
                    </span>
                    ? Proyek aktif milik klien ini juga akan diarsipkan dan bisa
                    dipulihkan kembali.
                  </>
                ) : (
                  <>
                    Apakah kamu yakin ingin menghapus klien{" "}
                    <span className="font-semibold text-[#1f1e30]">
                      {companyName}
                    </span>
                    ? Klien hanya bisa dihapus jika tidak memiliki proyek.
                    Tindakan ini tidak dapat dibatalkan.
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
                onClick={() => setDialogAction(null)}
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
