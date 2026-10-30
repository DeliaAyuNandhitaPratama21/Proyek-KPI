"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

const supabase = createClient();

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  label: "text-sm font-medium text-white",
  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",
  textarea:
    "w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:opacity-50",
  primaryButton:
    "inline-flex items-center justify-center rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
};

const fieldClass = "flex flex-col gap-2";

export default function EditProjectUpdatePage() {
  const params = useParams();
  const router = useRouter();

  const updateId = params.id as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!updateId) return;

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateId]);

  async function loadData() {
    setLoading(true);
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

    // Memeriksa role pengguna
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
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, project_name")
      .order("project_name", { ascending: true });

    if (projectError) {
      setError("Daftar proyek gagal dimuat. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    setProjects(projectData || []);

    // Mengambil data pembaruan yang akan diedit
    const { data: updateData, error: updateError } = await supabase
      .from("project_updates")
      .select(
        `
        id,
        project_id,
        title,
        content,
        client_visible,
        created_at,
        created_by
      `,
      )
      .eq("id", updateId)
      .single();

    if (updateError || !updateData) {
      setError("Data pembaruan proyek tidak ditemukan.");
      setLoading(false);
      return;
    }

    setProjectId(updateData.project_id || "");
    setTitle(updateData.title || "");
    setContent(updateData.content || "");
    setClientVisible(Boolean(updateData.client_visible));

    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!projectId) {
      setError("Proyek wajib dipilih.");
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
      // Mengambil data lama untuk activity log
      const { data: oldUpdate, error: oldUpdateError } = await supabase
        .from("project_updates")
        .select(
          `
          id,
          project_id,
          title,
          content,
          client_visible
        `,
        )
        .eq("id", updateId)
        .single();

      if (oldUpdateError || !oldUpdate) {
        setError("Data pembaruan proyek tidak ditemukan.");
        return;
      }

      // Menyimpan perubahan
      const { error: updateError } = await supabase
        .from("project_updates")
        .update({
          project_id: projectId,
          title: title.trim(),
          content: content.trim(),
          client_visible: clientVisible,
        })
        .eq("id", updateId);

      if (updateError) {
        setError("Pembaruan proyek gagal disimpan. Silakan coba lagi.");
        return;
      }

      // Mencatat aktivitas perubahan
      await createActivityLog({
        action: "UPDATE_PROJECT_UPDATE",
        description: `Mengubah pembaruan proyek "${title.trim()}".`,
        projectId: projectId,
        metadata: {
          update_id: updateId,
          old: {
            project_id: oldUpdate.project_id,
            title: oldUpdate.title,
            content: oldUpdate.content,
            client_visible: oldUpdate.client_visible,
          },
          new: {
            project_id: projectId,
            title: title.trim(),
            content: content.trim(),
            client_visible: clientVisible,
          },
        },
      });

      router.push("/dashboard/updates");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111111] px-5 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#333333] border-t-[#B7FE1A]" />
          <p className="text-sm text-zinc-400">Memuat data pembaruan...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      {/* Header */}
      <div className="mb-8 mt-2">
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

        <div className="mt-5">
          <h1 className={TEXT.pageTitle}>Edit Pembaruan Proyek</h1>
          <p className={TEXT.subtitle}>
            Ubah informasi perkembangan terbaru dari proyek.
          </p>
        </div>
      </div>

      {/* Pesan Kesalahan */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex max-w-4xl items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4 text-sm text-red-400"
        >
          <svg
            className="mt-0.5 shrink-0"
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
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <p>{error}</p>
        </div>
      )}

      {/* Form Pembaruan */}
      <form
        onSubmit={handleSubmit}
        className="flex max-w-4xl flex-col gap-6 rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-5 sm:p-8"
      >
        {/* Proyek */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${TEXT.input} appearance-none pr-11`}
              required
              disabled={saving}
            >
              <option value="" className="bg-[#1c1c1c]">
                Pilih proyek
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                  className="bg-[#1c1c1c]"
                >
                  {project.project_name}
                </option>
              ))}
            </select>

            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Judul */}
        <div className={fieldClass}>
          <label htmlFor="title" className={TEXT.label}>
            Judul Pembaruan <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Pengembangan Halaman Utama"
            className={TEXT.input}
            required
            disabled={saving}
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
            placeholder="Tuliskan perkembangan proyek..."
            rows={7}
            className={TEXT.textarea}
            required
            disabled={saving}
          />
          <p className="text-xs text-zinc-500">
            Jelaskan perkembangan pekerjaan yang telah dilakukan.
          </p>
        </div>

        {/* Visibilitas Klien */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] p-5">
          <label
            htmlFor="clientVisible"
            className="flex cursor-pointer items-start gap-4"
          >
            <input
              id="clientVisible"
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
              disabled={saving}
            />

            <div>
              <p className="text-sm font-medium text-white">
                Tampilkan kepada Klien
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Jika diaktifkan, pembaruan ini akan ditampilkan pada halaman
                proyek yang dapat diakses klien.
              </p>
            </div>
          </label>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/updates"
            className={TEXT.secondaryButton}
          >
            Batal
          </Link>

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
              "Simpan Perubahan"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}