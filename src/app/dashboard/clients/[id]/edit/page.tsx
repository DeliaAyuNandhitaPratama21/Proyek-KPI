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

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",

  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  textarea:
    "w-full resize-y rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 text-sm leading-6 text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

function BackLink({ isArchived }: { isArchived: boolean }) {
  return (
    <div className="mb-6">
      <Link
        href={isArchived ? "/dashboard/clients/archive" : "/dashboard/clients"}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Kembali
      </Link>
    </div>
  );
}

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const isArchived = client?.status === "Archived";

  const backUrl = isArchived
    ? "/dashboard/clients/archive"
    : "/dashboard/clients";

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
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil data klien:", error);
        setErrorMessage(`Gagal memuat data klien: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("Data klien tidak ditemukan atau tidak dapat diakses.");
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

      setLoading(false);
    }

    fetchClient();
  }, [clientId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyName.trim()) {
      setErrorMessage("Nama perusahaan wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .select("id, company_name")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        throw new Error(
          "Data klien tidak berhasil diperbarui. Periksa kembali data dan izin akses.",
        );
      }

      // Activity log bersifat best-effort: kegagalannya tidak membatalkan update.
      try {
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
      } catch (logError) {
        console.error("Gagal mencatat activity log:", logError);
      }

      // Klien aktif kembali ke daftar dengan penanda notifikasi berhasil.
      // Jika klien sedang diarsipkan, pertahankan tujuan kembali ke halaman arsip.
      router.push(isArchived ? backUrl : "/dashboard/clients?updated=1");
      router.refresh();
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <p className="text-sm text-[#777777]">Memuat data klien...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <BackLink isArchived={false} />

        <p className="mt-6 text-sm text-red-600">
          {errorMessage || "Data klien tidak ditemukan."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* KEMBALI */}
      <BackLink isArchived={Boolean(isArchived)} />

      {/* FORM EDIT KLIEN */}
      <form onSubmit={handleSubmit} className={formClass}>
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
          >
            {errorMessage}
          </div>
        )}

        <div className={fieldClass}>
          <label htmlFor="companyName" className={TEXT.label}>
            Nama Perusahaan <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className={TEXT.input}
            placeholder="Masukkan nama perusahaan"
            disabled={saving}
            maxLength={200}
            required
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="contactPerson" className={TEXT.label}>
            Nama Kontak
          </label>
          <input
            id="contactPerson"
            type="text"
            value={contactPerson}
            onChange={(event) => setContactPerson(event.target.value)}
            className={TEXT.input}
            placeholder="Masukkan nama kontak"
            disabled={saving}
            maxLength={200}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="whatsapp" className={TEXT.label}>
            Nomor WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            className={TEXT.input}
            placeholder="Masukkan nomor WhatsApp"
            disabled={saving}
            maxLength={30}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="email" className={TEXT.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={TEXT.input}
            placeholder="Masukkan email"
            disabled={saving}
            maxLength={254}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="address" className={TEXT.label}>
            Alamat
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={2}
            placeholder="Masukkan alamat perusahaan"
            className={TEXT.textarea}
            disabled={saving}
            maxLength={2000}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="notes" className={TEXT.label}>
            Catatan
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Tambahkan catatan jika diperlukan"
            className={TEXT.textarea}
            disabled={saving}
            maxLength={5000}
          />
        </div>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push(backUrl)}
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving}
            className={TEXT.primaryButton}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </main>
  );
}
