"use client";

import {
  FormEvent,
  useEffect,
  useState,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";

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

      <h1 className={TEXT.pageTitle}>Edit Tahapan Proyek</h1>

      <p className={TEXT.subtitle}>
        Perbarui informasi tahapan pengerjaan proyek.
      </p>
    </header>
  );
}

// Ikon panah dropdown
function SelectArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Dropdown custom
function CustomSelect({
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${TEXT.input} appearance-none pr-12 ${className}`}
      >
        {children}
      </select>

      <SelectArrow />
    </div>
  );
}

export default function EditMilestonePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const milestoneId = String(params.id);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [sortOrder, setSortOrder] = useState(1);
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      const [milestoneResult, projectsResult] = await Promise.all([
        supabase.from("milestones").select("*").eq("id", milestoneId).single(),

        supabase
          .from("projects")
          .select("id, project_name")
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (milestoneResult.error) {
        setError("Data tahapan proyek gagal dimuat.");
        setLoading(false);
        return;
      }

      if (projectsResult.error) {
        setError("Data proyek gagal dimuat.");
        setLoading(false);
        return;
      }

      const milestone = milestoneResult.data;

      setProjectId(String(milestone.project_id));
      setName(milestone.name || "");
      setDescription(milestone.description || "");
      setDueDate(milestone.due_date || "");
      setStatus(milestone.status || "Pending");
      setSortOrder(milestone.sort_order ?? 1);
      setClientVisible(milestone.client_visible ?? false);
      setProjects(projectsResult.data || []);
      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [milestoneId, supabase]);

  // SIMPAN PERUBAHAN
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!projectId || !name.trim()) {
      setError("Proyek dan nama tahapan wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("milestones")
      .update({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        status,
        sort_order: sortOrder,
        client_visible: clientVisible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    if (error) {
      setError("Tahapan proyek gagal diperbarui. Silakan coba lagi.");
      setSaving(false);
      return;
    }

    router.push("/dashboard/milestones");
    router.refresh();
  }

  // HAPUS TAHAPAN
  async function handleDelete() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus tahapan proyek ini?",
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", milestoneId);

    if (error) {
      setError("Tahapan proyek gagal dihapus. Silakan coba lagi.");
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
          <p className="text-sm text-zinc-400">Memuat data tahapan proyek...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* HEADER */}
      <PageHeader />

      {/* PESAN KESALAHAN */}
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
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            disabled={saving || projects.length === 0}
          >
            <option value="" disabled>
              Pilih proyek
            </option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </CustomSelect>

          {projects.length === 0 && (
            <p className="text-xs text-amber-400">
              Tidak ada data proyek yang tersedia.
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
            required
            disabled={saving}
            className={TEXT.input}
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
            placeholder="Jelaskan tahapan pengerjaan proyek..."
            rows={4}
            disabled={saving}
            className={TEXT.textarea}
          />
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

        {/* STATUS DAN URUTAN */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="status" className={TEXT.label}>
              Status
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
              min={1}
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(Math.max(1, Number(e.target.value)))
              }
              disabled={saving}
              className={TEXT.input}
            />
          </div>
        </div>

        {/* VISIBILITAS KLIEN */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111111]/70 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Tampilkan tahapan kepada klien
              </span>

              <span className="mt-1 block text-xs leading-5 text-zinc-400">
                Jika diaktifkan, tahapan ini dapat ditampilkan pada halaman
                monitoring proyek klien.
              </span>
            </span>
          </label>
        </div>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hapus Tahapan
          </button>

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
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
