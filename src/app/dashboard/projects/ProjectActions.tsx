"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type ProjectActionsProps = {
  projectId: number | string;
  projectName: string;
  canDelete: boolean;
};

export default function ProjectActions({
  projectId,
  projectName,
  canDelete,
}: ProjectActionsProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete() {
    if (deleting) return;

    const confirmed = window.confirm(
      `Yakin ingin menghapus proyek "${projectName}"?\n\n` +
        "Data proyek yang dihapus tidak dapat dipulihkan. " +
        "Data klien tidak akan ikut terhapus.",
    );

    if (!confirmed) return;

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
          `${error.message}${
            error.details ? ` Detail: ${error.details}` : ""
          }`,
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
      // Tidak perlu memanggil createActivityLog() lagi di sini.

      router.refresh();
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
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-1">
        <Link
          href={`/dashboard/projects/${projectId}/edit`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[#B7FE1A] transition-colors hover:bg-white/[0.05] hover:text-[#caff57]"
        >
          Edit
        </Link>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="max-w-xs text-xs leading-5 text-red-400"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}