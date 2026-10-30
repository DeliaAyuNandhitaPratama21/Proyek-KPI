"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { createActivityLog } from "../../../lib/activity-log";

type ClientActionsProps = {
  clientId: number;
  companyName: string;
  canDelete: boolean;
};

export default function ClientActions({
  clientId,
  companyName,
  canDelete,
}: ClientActionsProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete() {
    if (!canDelete) {
      setErrorMessage("Hanya Admin yang dapat menghapus klien.");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus klien "${companyName}"?\n\nKlien hanya bisa dihapus jika tidak memiliki proyek. Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

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
          "Gagal memeriksa proyek milik klien. Silakan coba lagi.",
        );
      }

      if ((count ?? 0) > 0) {
        throw new Error(
          "Klien tidak bisa dihapus karena masih memiliki proyek. Arsipkan klien jika sudah tidak aktif.",
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
          "Klien gagal dihapus. Periksa hak akses atau relasi data klien.",
        );
      }

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

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus klien.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/clients/${clientId}/edit`}
          className="text-sm font-medium text-[#B7FE1A] transition hover:opacity-70"
        >
          Edit
        </Link>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-500 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="max-w-xs text-xs text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}