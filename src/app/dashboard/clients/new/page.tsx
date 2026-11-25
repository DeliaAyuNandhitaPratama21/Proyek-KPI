"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

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

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/clients"
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

export default function NewClientPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    if (!companyName.trim()) {
      setError("Nama perusahaan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from("clients")
        .insert({
          company_name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          status: "Active",
        })
        .select("id, company_name")
        .single();

      if (insertError) {
        console.error("Gagal menambahkan klien:", insertError);
        throw new Error("Data klien gagal disimpan. Silakan coba lagi.");
      }

      // Activity log bersifat best-effort:
      // kegagalannya tidak membatalkan penambahan klien.
      try {
        const logResult = await createActivityLog({
          action: "CREATE_CLIENT",
          description: `Menambahkan klien "${data.company_name}"`,
          metadata: {
            client_id: data.id,
            company_name: data.company_name,
          },
        });

        if (logResult.error) {
          console.error("Gagal mencatat aktivitas:", logResult.error.message);
        }
      } catch (logError) {
        console.error("Gagal mencatat aktivitas:", logError);
      }

      router.push("/dashboard/clients?created=1");
      router.refresh();
    } catch (err) {
      console.error("Terjadi kesalahan:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* KEMBALI */}
      <BackLink />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* FORM TAMBAH KLIEN */}
      <form onSubmit={handleSubmit} className={formClass}>
        <div className={fieldClass}>
          <label htmlFor="companyName" className={TEXT.label}>
            Nama Perusahaan <span className="text-red-500">*</span>
          </label>

          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Masukkan nama perusahaan"
            className={TEXT.input}
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
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Masukkan nama kontak"
            className={TEXT.input}
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
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Masukkan nomor WhatsApp"
            className={TEXT.input}
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Masukkan email"
            className={TEXT.input}
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
            onChange={(e) => setAddress(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
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
            onClick={() => router.push("/dashboard/clients")}
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
            {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>
    </main>
  );
}
