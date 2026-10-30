"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

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

export default function AddProjectUpdatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [clientVisible, setClientVisible] = useState(true);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      // Memeriksa login pengguna
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Memeriksa hak akses pengguna
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile ||
        !["Admin", "Project Manager", "Staff"].includes(profile.role)
      ) {
        router.push("/dashboard");
        return;
      }

      // Mengambil daftar proyek
      const { data, error: projectsError } = await supabase
        .from("projects")
        .select("id, project_name")
        .order("created_at", { ascending: false });

      if (projectsError) {
        setError("Data proyek gagal dimuat. Silakan muat ulang halaman.");
        setLoadingProjects(false);
        return;
      }

      setProjects(data || []);

      if (data && data.length > 0) {
        setProjectId(data[0].id);
      }

      setLoadingProjects(false);
    }

    loadProjects();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek.");
      return;
    }

    if (!title.trim()) {
      setError("Judul pembaruan wajib diisi.");
      return;
    }

    if (!content.trim()) {
      setError("Isi pembaruan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      // Mendapatkan pengguna yang sedang login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Sesi pengguna tidak ditemukan. Silakan login kembali.");
        return;
      }

      // Menyimpan pembaruan proyek
      const { data: insertedUpdate, error: insertError } = await supabase
        .from("project_updates")
        .insert({
          project_id: projectId,
          title: title.trim(),
          content: content.trim(),
          client_visible: clientVisible,
          created_by: user.id,
        })
        .select("id, project_id, title")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // Mencatat aktivitas
      const { error: logError } = await createActivityLog({
        action: "CREATE_PROJECT_UPDATE",
        description: `Membuat pembaruan proyek "${title.trim()}".`,
        projectId,
        metadata: {
          update_id: insertedUpdate.id,
          title: title.trim(),
          client_visible: clientVisible,
        },
      });

      if (logError) {
        console.error("Gagal mencatat aktivitas:", logError);
      }

      router.push("/dashboard/updates");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProjects) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <header className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Tambah Pembaruan Proyek</h1>
          <p className={TEXT.subtitle}>
            Catat perkembangan terbaru dari proyek.
          </p>
        </header>

        <div className={formClass}>
          <p className="text-sm text-zinc-400">Memuat data proyek...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Judul Halaman */}
      <header className="mb-8">
        <div className="mb-5">
          <Link
            href="/dashboard/updates"
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

        <h1 className={TEXT.pageTitle}>Tambah Pembaruan Proyek</h1>
        <p className={TEXT.subtitle}>
          Catat perkembangan terbaru dan tentukan informasi yang dapat dilihat
          oleh klien.
        </p>
      </header>

      {/* Pesan Kesalahan */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Formulir */}
      <form onSubmit={handleSubmit} className={formClass}>
        {/* Proyek */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="project"
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
              pembaruan.
            </p>
          )}
        </div>

        {/* Judul Pembaruan */}
        <div className={fieldClass}>
          <label htmlFor="title" className={TEXT.label}>
            Judul Pembaruan <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Pengembangan halaman utama selesai"
            className={TEXT.input}
            disabled={saving}
            required
          />
        </div>

        {/* Isi Pembaruan */}
        <div className={fieldClass}>
          <label htmlFor="content" className={TEXT.label}>
            Isi Pembaruan <span className="text-red-500">*</span>
          </label>

          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Jelaskan perkembangan terbaru dari proyek..."
            className={TEXT.textarea}
            disabled={saving}
            required
          />
        </div>

        {/* Visibilitas Klien */}
        <div className="flex items-start gap-3 rounded-xl border border-[#2a2a2a] bg-[#111111]/70 p-4">
          <input
            id="clientVisible"
            type="checkbox"
            checked={clientVisible}
            onChange={(e) => setClientVisible(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
            disabled={saving}
          />

          <div>
            <label
              htmlFor="clientVisible"
              className="cursor-pointer text-sm font-medium text-white"
            >
              Tampilkan kepada klien
            </label>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Jika diaktifkan, pembaruan ini dapat dilihat klien melalui halaman
              proyek publik.
            </p>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/updates")}
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
              "Simpan Pembaruan"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
