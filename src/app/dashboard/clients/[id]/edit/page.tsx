"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type ClientData = {
  id: number;
  company_name: string;
  contact_person: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: string | null;
};

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [client, setClient] = useState<ClientData | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchClient() {
      if (!Number.isInteger(clientId) || clientId <= 0) {
        setErrorMessage("ID klien tidak valid.");
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, company_name, contact_person, whatsapp, email, address, notes, status",
        )
        .eq("id", clientId)
        .single();

      if (error || !data) {
        setErrorMessage("Data klien tidak ditemukan.");
        setLoading(false);
        return;
      }

      const clientData = data as ClientData;

      setClient(clientData);
      setCompanyName(clientData.company_name ?? "");
      setContactPerson(clientData.contact_person ?? "");
      setWhatsapp(clientData.whatsapp ?? "");
      setEmail(clientData.email ?? "");
      setAddress(clientData.address ?? "");
      setNotes(clientData.notes ?? "");
      setStatus(clientData.status ?? "Active");
      setLoading(false);
    }

    fetchClient();
  }, [clientId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("clients")
        .update({
          company_name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .select("id, company_name")
        .single();

      if (error) throw new Error(error.message);

      const logResult = await createActivityLog({
        action: "UPDATE_CLIENT",
        description: `Memperbarui data klien ${data.company_name}`,
        metadata: {
          client_id: data.id,
          company_name: data.company_name,
        },
      });

      if (logResult.error) {
        console.error("Gagal mencatat activity log:", logResult.error);
      }

      setSuccessMessage("Data klien berhasil diperbarui.");

      setClient({
        ...client,
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        status,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui data klien.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!client) return;

    const confirmed = window.confirm(
      `Yakin ingin menghapus klien "${client.company_name}"? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const { count, error: projectError } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);

      if (projectError) {
        throw new Error("Gagal memeriksa proyek milik klien.");
      }

      if ((count ?? 0) > 0) {
        throw new Error(
          "Klien tidak bisa dihapus karena masih memiliki proyek.",
        );
      }

      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .select("id, company_name")
        .single();

      if (error) throw new Error(error.message);

      const logResult = await createActivityLog({
        action: "DELETE_CLIENT",
        description: `Menghapus klien ${data.company_name}`,
        metadata: {
          client_id: data.id,
          company_name: data.company_name,
        },
      });

      if (logResult.error) {
        console.error("Gagal mencatat activity log:", logResult.error);
      }

      router.push("/dashboard/clients");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menghapus klien.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleArchive() {
    if (!client) return;

    const confirmed = window.confirm(
      `Yakin ingin mengarsipkan klien "${client.company_name}"?`,
    );

    if (!confirmed) return;

    setArchiving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("clients")
        .update({
          status: "Archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .select("id, company_name")
        .single();

      if (error) throw new Error(error.message);

      const logResult = await createActivityLog({
        action: "ARCHIVE_CLIENT",
        description: `Mengarsipkan klien ${data.company_name}`,
        metadata: {
          client_id: data.id,
          company_name: data.company_name,
        },
      });

      if (logResult.error) {
        console.error("Gagal mencatat activity log:", logResult.error);
      }

      setStatus("Archived");
      setClient({ ...client, status: "Archived" });
      setSuccessMessage("Klien berhasil diarsipkan.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengarsipkan klien.",
      );
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] p-6 text-white">
        <p className="text-sm text-zinc-400">Memuat data klien...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="min-h-screen bg-[#111111] p-6 text-white">
        <Link
          href="/dashboard/clients"
          className="text-sm text-[#B7FE1A] hover:opacity-70"
        >
          ← Kembali ke Klien
        </Link>

        <p className="mt-6 text-red-400">
          {errorMessage || "Data klien tidak ditemukan."}
        </p>
      </main>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-zinc-700 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#B7FE1A]";

  const labelClass = "text-sm font-medium text-zinc-300";

  return (
    <main className="min-h-screen bg-[#111111] p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/clients"
          className="text-sm text-zinc-400 transition hover:text-[#B7FE1A]"
        >
          ← Kembali ke Klien
        </Link>

        <div className="mb-6 mt-5">
          <h1 className="text-2xl font-semibold">Edit Klien</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Perbarui informasi klien di bawah ini.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800 bg-[#191919] p-6"
        >
          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-lg border border-[#B7FE1A]/20 bg-[#B7FE1A]/10 px-4 py-3 text-sm text-[#B7FE1A]">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="companyName" className={labelClass}>
                Nama Perusahaan *
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className={inputClass}
                placeholder="Masukkan nama perusahaan"
                required
              />
            </div>

            <div>
              <label htmlFor="contactPerson" className={labelClass}>
                Nama Kontak
              </label>
              <input
                id="contactPerson"
                type="text"
                value={contactPerson}
                onChange={(event) => setContactPerson(event.target.value)}
                className={inputClass}
                placeholder="Masukkan nama kontak"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className={labelClass}>
                WhatsApp
              </label>
              <input
                id="whatsapp"
                type="text"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                className={inputClass}
                placeholder="Masukkan nomor WhatsApp"
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="Masukkan email"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className={labelClass}>
                Alamat
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className={inputClass}
                placeholder="Masukkan alamat"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className={labelClass}>
                Catatan
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={inputClass}
                placeholder="Masukkan catatan tambahan"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="status" className={labelClass}>
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClass}
              >
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving || archiving}
              className="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Hapus Klien"}
            </button>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleArchive}
                disabled={
                  archiving || deleting || saving || status === "Archived"
                }
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {archiving ? "Mengarsipkan..." : "Arsipkan"}
              </button>

              <Link
                href="/dashboard/clients"
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={saving || deleting || archiving}
                className="rounded-lg bg-[#B7FE1A] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#a6e817] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
