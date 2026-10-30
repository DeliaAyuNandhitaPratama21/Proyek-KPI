"use client";

import {
  FormEvent,
  useEffect,
  useState,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Project = {
  id: string;
  project_name: string;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

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
        href="/dashboard/milestones"
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

// Header halaman
function PageHeader() {
  return (
    <header className="mb-8">
      <BackLink />

      <h1 className={TEXT.pageTitle}>Tambah Tahapan Proyek</h1>

      <p className={TEXT.subtitle}>
        Tambahkan tahapan untuk mengatur proses pengerjaan proyek.
      </p>
    </header>
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

// Dropdown custom
function CustomSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={`${TEXT.input} appearance-none pr-12 ${className || ""}`}
      >
        {children}
      </select>

      <SelectArrow />
    </div>
  );
}

export default function NewMilestonePage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);

  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [sortOrder, setSortOrder] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // LOAD PROJECTS
  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_name")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Data proyek gagal dimuat. Silakan muat ulang halaman.");
        setLoading(false);
        return;
      }

      setProjects(data || []);
      setLoading(false);
    }

    loadProjects();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CREATE MILESTONE
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek terlebih dahulu.");
      setSaving(false);
      return;
    }

    if (!name.trim()) {
      setError("Nama tahapan proyek wajib diisi.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("milestones").insert({
      project_id: projectId,
      name: name.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      status,
      sort_order: sortOrder,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard/milestones");
    router.refresh();
  }

  // LOADING STATE
  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <PageHeader />

        <div className={formClass}>
          <p className="text-sm text-zinc-400">Memuat data proyek...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <PageHeader />

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
        {/* PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="projectId" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={saving || projects.length === 0}
            required
          >
            <option value="">Pilih proyek</option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </CustomSelect>

          {projects.length === 0 && (
            <p className="text-xs leading-5 text-zinc-500">
              Belum ada proyek. Tambahkan proyek terlebih dahulu sebelum membuat
              tahapan proyek.
            </p>
          )}
        </div>

        {/* NAMA TAHAPAN */}
        <div className={fieldClass}>
          <label htmlFor="name" className={TEXT.label}>
            Nama Tahapan <span className="text-red-500">*</span>
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Desain Halaman Utama"
            className={TEXT.input}
            disabled={saving}
            required
          />
        </div>

        {/* DESKRIPSI */}
        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Jelaskan tahapan yang akan dikerjakan..."
            className={TEXT.textarea}
            disabled={saving}
          />

          <p className="text-xs leading-5 text-zinc-500">
            Berikan penjelasan singkat mengenai tahapan proyek.
          </p>
        </div>

        {/* TENGGAT WAKTU */}
        <div className={fieldClass}>
          <label htmlFor="dueDate" className={TEXT.label}>
            Tenggat Waktu
          </label>

          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={saving}
            className={`${TEXT.input} pr-12 [&::-webkit-calendar-picker-indicator]:mr-1`}
          />
        </div>

        {/* STATUS & URUTAN */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="status" className={TEXT.label}>
              Status Tahapan
            </label>

            <CustomSelect
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
            >
              <option value="Pending">Menunggu</option>
              <option value="In Progress">Dalam Proses</option>
              <option value="Completed">Selesai</option>
            </CustomSelect>
          </div>

          <div className={fieldClass}>
            <label htmlFor="sortOrder" className={TEXT.label}>
              Urutan Tahapan
            </label>

            <input
              id="sortOrder"
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={TEXT.input}
              disabled={saving}
              required
            />
          </div>
        </div>

        {/* TOMBOL */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/milestones")}
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving || projects.length === 0}
            className={TEXT.primaryButton}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Menyimpan...
              </>
            ) : (
              "Simpan Tahapan"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
