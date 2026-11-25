"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { SelectHTMLAttributes } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

type ProjectUpdate = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  client_visible: boolean | null;
  created_by: string | null;
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

// TOMBOL PANAH DROPDOWN
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
        className={`${TEXT.input} appearance-none pr-12 ${className || ""}`}
      >
        {children}
      </select>
      <SelectArrow />
    </div>
  );
}

export default function EditProjectUpdatePage() {
  const params = useParams();
  const router = useRouter();

  const updateId = String(params.id ?? "");
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);
  const [role, setRole] = useState("");

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT DATA UPDATE DAN MEMERIKSA HAK AKSES
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      let redirecting = false;

      if (!updateId) {
        setError("ID pembaruan proyek tidak valid.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        // MEMERIKSA LOGIN
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          redirecting = true;
          router.replace("/login");
          return;
        }

        // MEMERIKSA ROLE
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (
          profileError ||
          !profile ||
          !["Admin", "Project Manager"].includes(profile.role)
        ) {
          redirecting = true;
          router.replace("/dashboard");
          return;
        }

        setRole(profile.role);

        // MEMUAT UPDATE
        const { data: updateData, error: updateError } = await supabase
          .from("project_updates")
          .select("id, project_id, title, content, client_visible, created_by")
          .eq("id", updateId)
          .single();

        if (cancelled) return;

        if (updateError || !updateData) {
          setError(
            "Data pembaruan proyek tidak ditemukan atau kamu tidak memiliki akses.",
          );
          return;
        }

        const update = updateData as ProjectUpdate;

        // MEMUAT PROYEK YANG BOLEH DIAKSES.
        // ADMIN: SEMUA PROYEK AKTIF.
        // PM: PROYEK DENGAN pic_id MILIKNYA.
        let projectQuery = supabase
          .from("projects")
          .select("id, project_name")
          .eq("is_archived", false)
          .order("project_name", { ascending: true });

        if (profile.role === "Project Manager") {
          projectQuery = projectQuery.eq("pic_id", user.id);
        }

        const { data: projectData, error: projectError } = await projectQuery;

        if (cancelled) return;

        if (projectError) {
          setError("Daftar proyek gagal dimuat. Silakan coba lagi.");
          return;
        }

        const allowedProjects = (projectData ?? []) as Project[];

        // Pastikan pembaruan berada pada proyek yang boleh diakses.
        if (
          !allowedProjects.some(
            (project) => String(project.id) === String(update.project_id),
          )
        ) {
          redirecting = true;
          router.replace("/dashboard/updates");
          return;
        }

        setProjects(allowedProjects);

        setProjectId(update.project_id);
        setTitle(update.title || "");
        setContent(update.content || "");

        setClientVisible(Boolean(update.client_visible));
      } catch (loadError) {
        console.error("Gagal memuat pembaruan proyek:", loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Terjadi kesalahan saat memuat data pembaruan.",
          );
        }
      } finally {
        if (!cancelled && !redirecting) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [updateId, router, supabase]);

  // SIMPAN PERUBAHAN
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    if (!projectId || !projects.some((project) => project.id === projectId)) {
      setError("Proyek tidak valid atau tidak tersedia untuk akun ini.");
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
      // MEMERIKSA LOGIN KEMBALI
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
      }

      // MEMERIKSA ROLE TERBARU
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
        throw new Error("Kamu tidak memiliki izin mengedit pembaruan.");
      }

      // MEMUAT DATA UPDATE LAMA
      const { data: oldUpdate, error: oldUpdateError } = await supabase
        .from("project_updates")
        .select("id, project_id, title, content, client_visible, created_by")
        .eq("id", updateId)
        .single();

      if (oldUpdateError || !oldUpdate) {
        throw new Error("Data pembaruan proyek tidak ditemukan.");
      }

      // PM HANYA BOLEH MENGEDIT PEMBARUAN PADA PROYEK MILIKNYA.
      if (currentRole === "Project Manager") {
        const { data: ownedProjects, error: ownershipError } = await supabase
          .from("projects")
          .select("id")
          .eq("pic_id", user.id)
          .in("id", [oldUpdate.project_id, projectId])
          .eq("is_archived", false);

        if (ownershipError) {
          throw new Error("Gagal memverifikasi kepemilikan proyek.");
        }

        const ownedProjectIds = new Set(
          (ownedProjects ?? []).map((project) => String(project.id)),
        );

        if (
          !ownedProjectIds.has(String(oldUpdate.project_id)) ||
          !ownedProjectIds.has(String(projectId))
        ) {
          throw new Error(
            "Kamu hanya dapat mengedit pembaruan pada proyek yang menjadi tanggung jawabmu.",
          );
        }
      }

      // ADMIN DAN PM DAPAT MENGUBAH VISIBILITAS KLIEN.
      const updatePayload = {
        project_id: projectId,
        title: title.trim(),
        content: content.trim(),
        client_visible: clientVisible,
      };

      // UPDATE DATA
      const { data: updatedData, error: updateError } = await supabase
        .from("project_updates")
        .update(updatePayload)
        .eq("id", updateId)
        .select("id, project_id, title")
        .maybeSingle();

      if (updateError) {
        console.error("Gagal memperbarui update:", updateError);
        throw new Error(
          `Pembaruan proyek gagal disimpan: ${updateError.message}`,
        );
      }

      if (!updatedData) {
        throw new Error(
          "Pembaruan tidak berhasil. Data mungkin tidak ditemukan atau kamu tidak memiliki izin.",
        );
      }

      // ACTIVITY LOG
      // KEGAGALAN LOG TIDAK MEMBATALKAN UPDATE.
      try {
        const { error: logError } = await createActivityLog({
          action: "UPDATE_PROJECT_UPDATE",
          description: `Mengubah pembaruan proyek "${title.trim()}".`,
          projectId: updatedData.project_id,
          metadata: {
            update_id: updateId,
            old: {
              project_id: oldUpdate.project_id,
              title: oldUpdate.title,
              content: oldUpdate.content,
              client_visible: oldUpdate.client_visible,
            },
            new: {
              project_id: updatedData.project_id,
              title: title.trim(),
              content: content.trim(),
              client_visible: clientVisible,
            },
          },
        });

        if (logError) {
          console.error("Gagal mencatat aktivitas:", logError);
        }
      } catch (logError) {
        console.error("Activity log exception:", logError);
      }

      router.push("/dashboard/updates?success=updated");
      router.refresh();
    } catch (submitError) {
      console.error("Gagal memperbarui pembaruan proyek:", submitError);

      setError(
        submitError instanceof Error
          ? `Terjadi kesalahan: ${submitError.message}`
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  // LOADING STATE
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
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

        <div className={formClass}>
          <p className="text-sm text-[#777777]">Memuat data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* TOMBOL KEMBALI */}
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

      {/* PESAN KESALAHAN */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-5xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          <p>{error}</p>
        </div>
      )}

      {/* FORM PEMBARUAN */}
      <form onSubmit={handleSubmit} className={formClass}>
        {/* PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <div className="relative w-full">
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              disabled={saving}
              className={`${TEXT.input} appearance-none pr-12`}
            >
              <option value="" disabled hidden>
                Pilih proyek
              </option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>

            <SelectArrow />
          </div>

          {projects.length === 0 && (
            <p className="text-xs leading-5 text-[#777777]">
              Belum ada proyek yang tersedia.
            </p>
          )}
        </div>

        {/* JUDUL */}
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

        {/* ISI PEMBARUAN */}
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
        </div>

        {/* VISIBILITAS KLIEN */}
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
            <input
              id="clientVisible"
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
              disabled={saving}
              aria-label="Tampilkan kepada Klien"
            />

            <div>
              <p className="text-sm font-medium text-[#1f1e30]">
                Tampilkan kepada Klien
              </p>

              <p className="mt-1 text-sm leading-6 text-[#777777]">
                Jika diaktifkan, pembaruan ini akan ditampilkan pada halaman
                proyek yang dapat diakses klien.
              </p>
            </div>
          </div>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/dashboard/updates" className={TEXT.secondaryButton}>
            Batal
          </Link>

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
