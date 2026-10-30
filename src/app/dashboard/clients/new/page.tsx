"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  textarea:
    "w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50",

  secondaryButton:
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-4xl flex-col gap-6 rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-5 sm:p-8";

function BackLink() {
  return (
    <div className="mb-5">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-[#B7FE1A]"
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

function PageHeader() {
  return (
    <header className="mb-8">
      <BackLink />
      <h1 className={TEXT.pageTitle}>Tambah Klien</h1>
      <p className={TEXT.subtitle}>
        Tambahkan informasi klien baru ke dalam sistem.
      </p>
    </header>
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

      const logResult = await createActivityLog({
        action: "CREATE_CLIENT",
        description: `Menambahkan klien "${data.company_name}"`,
        metadata: {
          client_id: data.id,
          company_name: data.company_name,
        },
      });

      if (logResult.error) {
        console.error(
          "Gagal mencatat aktivitas:",
          logResult.error.message
        );
      }

      router.push("/dashboard/clients");
      router.refresh();
    } catch (err) {
      console.error("Terjadi kesalahan:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      <PageHeader />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

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
            placeholder="Contoh: 081234567890"
            className={TEXT.input}
            disabled={saving}
            maxLength={30}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="email" className={TEXT.label}>
            Alamat Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
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
            rows={3}
            placeholder="Masukkan alamat klien"
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
            rows={4}
            placeholder="Tambahkan catatan mengenai klien..."
            className={TEXT.textarea}
            disabled={saving}
            maxLength={5000}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Menyimpan...
              </>
            ) : (
              "Simpan Klien"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}