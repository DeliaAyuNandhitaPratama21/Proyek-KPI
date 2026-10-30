"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";

type Client = {
  id: string;
  company_name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

type ProjectStatus = {
  id: string;
  name: string;
  sort_order: number;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  sectionTitle: "text-lg font-semibold text-white",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] pl-4 pr-12 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:opacity-50",

  textarea:
    "w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:opacity-50",

  primaryButton:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50",

  secondaryButton:
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-4xl flex-col gap-6 rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-5 sm:p-8";

// Tombol kembali
function BackLink() {
  return (
    <div className="mb-5">
      <Link
        href="/dashboard/projects"
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

// Ikon panah dropdown
function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Komponen dropdown dengan ikon panah khusus
function CustomSelect({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={`${TEXT.input} appearance-none ${className || ""}`}
      >
        {children}
      </select>

      <SelectArrow />
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);

  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("Website");
  const [description, setDescription] = useState("");
  const [pic, setPic] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [statusId, setStatusId] = useState("");
  const [progress, setProgress] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const [clientsResult, usersResult, statusesResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, company_name")
          .eq("status", "Active")
          .order("company_name"),

        supabase.from("users").select("id, name, role").order("name"),

        supabase
          .from("project_statuses")
          .select("id, name, sort_order")
          .order("sort_order"),
      ]);

      if (clientsResult.error) {
        setError(clientsResult.error.message);
        setLoading(false);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        setLoading(false);
        return;
      }

      if (statusesResult.error) {
        setError(statusesResult.error.message);
        setLoading(false);
        return;
      }

      setClients(clientsResult.data || []);
      setUsers(usersResult.data || []);
      setStatuses(statusesResult.data || []);

      if (statusesResult.data && statusesResult.data.length > 0) {
        setStatusId(statusesResult.data[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!clientId) {
      setError("Silakan pilih klien.");
      setSaving(false);
      return;
    }

    if (!projectName.trim()) {
      setError("Nama proyek wajib diisi.");
      setSaving(false);
      return;
    }

    if (!statusId) {
      setError("Silakan pilih status proyek.");
      setSaving(false);
      return;
    }

    const publicToken = crypto.randomUUID().replaceAll("-", "");

    const { error } = await supabase.from("projects").insert({
      client_id: clientId,
      project_name: projectName.trim(),
      project_type: projectType || null,
      description: description.trim() || null,
      pic: pic || null,
      start_date: startDate || null,
      deadline: deadline || null,
      status_id: statusId,
      progress,
      public_token: publicToken,
      public_visibility: true,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard/projects");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <header className="mb-8 mt-2">
          <BackLink />

          <h1 className={TEXT.pageTitle}>Tambah Proyek</h1>

          <p className={TEXT.subtitle}>
            Siapkan informasi proyek website baru.
          </p>
        </header>

        <div className="max-w-4xl rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-6">
          <p className="text-sm text-zinc-400">Memuat data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <header className="mb-8 mt-2">
        <BackLink />

        <h1 className={TEXT.pageTitle}>Tambah Proyek</h1>

        <p className={TEXT.subtitle}>
          Tambahkan proyek website baru dan tentukan informasi pengerjaannya.
        </p>
      </header>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className={formClass}>
        {/* CLIENT */}
        <div className={fieldClass}>
          <label htmlFor="client" className={TEXT.label}>
            Klien <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Pilih klien</option>

            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </CustomSelect>

          {clients.length === 0 && (
            <p className="text-xs leading-5 text-zinc-500">
              Belum ada klien aktif. Tambahkan atau aktifkan data klien terlebih
              dahulu.
            </p>
          )}
        </div>

        {/* PROJECT NAME */}
        <div className={fieldClass}>
          <label htmlFor="projectName" className={TEXT.label}>
            Nama Proyek <span className="text-red-500">*</span>
          </label>

          <input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Contoh: Website Company Profile PT Maju Jaya"
            className={TEXT.input}
            required
          />
        </div>

        {/* PROJECT TYPE */}
        <div className={fieldClass}>
          <label htmlFor="projectType" className={TEXT.label}>
            Jenis Proyek
          </label>

          <CustomSelect
            id="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="Website">Website</option>
            <option value="Landing Page">Landing Page</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="Company Profile">Company Profile</option>
            <option value="Web Application">Aplikasi Web</option>
          </CustomSelect>
        </div>

        {/* DESCRIPTION */}
        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi Proyek
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Jelaskan gambaran umum proyek..."
            className={TEXT.textarea}
          />
        </div>

        {/* PIC */}
        <div className={fieldClass}>
          <label htmlFor="pic" className={TEXT.label}>
            Penanggung Jawab (PIC)
          </label>

          <CustomSelect
            id="pic"
            value={pic}
            onChange={(e) => setPic(e.target.value)}
          >
            <option value="">Pilih penanggung jawab</option>

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="startDate" className={TEXT.label}>
              Tanggal Mulai
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${TEXT.input} [&::-webkit-calendar-picker-indicator]:ml-1`}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="deadline" className={TEXT.label}>
              Tenggat Waktu
            </label>

            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={startDate || undefined}
              className={`${TEXT.input} [&::-webkit-calendar-picker-indicator]:ml-1`}
            />
          </div>
        </div>

        {/* STATUS */}
        <div className={fieldClass}>
          <label htmlFor="status" className={TEXT.label}>
            Status Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="status"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
          >
            <option value="">Pilih status proyek</option>

            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* PROGRESS */}
        <div className={fieldClass}>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="progress" className={TEXT.label}>
              Progres Proyek
            </label>

            <span className="text-sm font-semibold tabular-nums text-[#B7FE1A]">
              {progress}%
            </span>
          </div>

          <input
            id="progress"
            type="range"
            min="0"
            max="100"
            step="25"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full cursor-pointer accent-[#B7FE1A]"
          />

          <div className="flex justify-between text-xs text-zinc-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* PUBLIC LINK INFO */}
        <div className="flex items-start gap-3 rounded-xl border border-[#2a2a2a] bg-[#111111]/70 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#B7FE1A]/10 text-[#B7FE1A]">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-medium text-white">
              Tautan Pemantauan Klien
            </p>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Tautan publik akan dibuat secara otomatis agar klien dapat
              memantau informasi proyek. Pengaturan visibilitas dapat dikelola
              setelah proyek dibuat.
            </p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/projects")}
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving || clients.length === 0 || statuses.length === 0}
            className={TEXT.primaryButton}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Menyimpan...
              </>
            ) : (
              "Simpan Proyek"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}