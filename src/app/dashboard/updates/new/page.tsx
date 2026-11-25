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
  label: "block text-sm font-medium text-[#1f1e30]",

  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  textarea:
    "w-full resize-y rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 text-sm leading-6 text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

// TOMBOL KEMBALI
function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/updates"
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

// IKON PANAH DROPDOWN
function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]"
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

// DROPDOWN CUSTOM
function CustomSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
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

export default function AddProjectUpdatePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT PROYEK DAN MEMERIKSA HAK AKSES ADMIN/PM
  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        // ADMIN, PROJECT MANAGER, DAN STAFF DAPAT MEMBUAT UPDATE.
        if (
          profileError ||
          !profile ||
          !["Admin", "Project Manager"].includes(profile.role)
        ) {
          router.replace("/dashboard/updates");
          return;
        }

        const currentRole = profile.role;

        // ADMIN: SEMUA PROYEK AKTIF.
        // PM: PROYEK YANG MENJADI TANGGUNG JAWABNYA.
        let projectQuery = supabase
          .from("projects")
          .select("id, project_name")
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (currentRole === "Project Manager") {
          projectQuery = projectQuery.eq("pic_id", user.id);
        }

        const { data, error: projectsError } = await projectQuery;

        if (cancelled) return;

        if (projectsError) {
          console.error("Gagal memuat proyek:", projectsError);
          setError("Data proyek gagal dimuat. Silakan muat ulang halaman.");
          return;
        }

        setProjects((data ?? []) as Project[]);
        setProjectId("");
      } catch (loadError) {
        console.error("Gagal memuat proyek:", loadError);

        if (!cancelled) {
          setError("Terjadi kesalahan saat memuat data proyek.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // SIMPAN PEMBARUAN
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || loadingProjects) return;

    setError("");

    const selectedProjectId = String(projectId).trim();

    const selectedProject = projects.find(
      (project) => String(project.id).trim() === selectedProjectId,
    );

    if (!selectedProjectId || !selectedProject) {
      setError("Silakan pilih proyek yang tersedia.");
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
      // VERIFIKASI KEMBALI PENGGUNA
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Sesi pengguna tidak ditemukan. Silakan login kembali.",
        );
      }

      // VERIFIKASI ROLE TERBARU
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Gagal memverifikasi hak akses pengguna.");
      }

      const currentRole = profile.role;

      if (!["Admin", "Project Manager"].includes(currentRole)) {
        throw new Error("Kamu tidak memiliki izin membuat pembaruan proyek.");
      }

      const finalClientVisible = clientVisible;

      // SIMPAN PEMBARUAN PROYEK
      const { data: insertedUpdate, error: insertError } = await supabase
        .from("project_updates")
        .insert({
          project_id: selectedProjectId,
          title: title.trim(),
          content: content.trim(),
          client_visible: finalClientVisible,
          created_by: user.id,
        })
        .select("id, project_id, title")
        .single();

      if (insertError) {
        console.error("Gagal menyimpan pembaruan:", insertError);
        throw new Error(insertError.message);
      }

      if (!insertedUpdate) {
        throw new Error("Pembaruan proyek gagal disimpan.");
      }

      // ACTIVITY LOG
      // KEGAGALAN LOG TIDAK MEMBATALKAN PEMBARUAN YANG TERSIMPAN.
      try {
        const { error: logError } = await createActivityLog({
          action: "CREATE_PROJECT_UPDATE",
          description: `Membuat pembaruan proyek "${insertedUpdate.title}".`,
          projectId: insertedUpdate.project_id,
          metadata: {
            update_id: insertedUpdate.id,
            title: insertedUpdate.title,
            client_visible: finalClientVisible,
          },
        });

        if (logError) {
          console.error("Gagal mencatat aktivitas:", logError);
        }
      } catch (logError) {
        console.error("Activity log exception:", logError);
      }

      router.push("/dashboard/updates?success=created");
      router.refresh();
    } catch (submitError) {
      console.error("Gagal menyimpan pembaruan proyek:", submitError);

      setError(
        submitError instanceof Error
          ? `Terjadi kesalahan: ${submitError.message}`
          : "Terjadi kesalahan. Silakan coba kembali.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {/* PESAN KESALAHAN */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-5xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* FORMULIR */}
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
            disabled={saving || loadingProjects}
          >
            <option value="" disabled hidden>
              Pilih proyek
            </option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </CustomSelect>

          {projects.length === 0 && (
            <p className="text-xs leading-5 text-[#777777]">
              Belum ada proyek yang tersedia untuk membuat pembaruan.
            </p>
          )}
        </div>

        {/* JUDUL PEMBARUAN */}
        <div className={fieldClass}>
          <label htmlFor="title" className={TEXT.label}>
            Judul Pembaruan <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan judul pembaruan"
            className={TEXT.input}
            disabled={saving}
            required
          />
        </div>

        {/* ISI PEMBARUAN */}
        <div className={fieldClass}>
          <label htmlFor="content" className={TEXT.label}>
            Isi Pembaruan <span className="text-red-500">*</span>
          </label>

          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Tambahkan informasi mengenai perkembangan terbaru proyek"
            className={TEXT.textarea}
            disabled={saving}
            required
          />
        </div>

        {/* VISIBILITAS KLIEN */}
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
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
              className="cursor-pointer text-sm font-medium text-[#1f1e30]"
            >
              Tampilkan kepada klien
            </label>

            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Jika diaktifkan, pembaruan ini dapat dilihat klien melalui
              halaman proyek publik.
            </p>
          </div>
        </div>

        {/* TOMBOL AKSI */}
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
            disabled={saving || loadingProjects || projects.length === 0}
            className={TEXT.primaryButton}
          >
            {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>
    </main>
  );
}
