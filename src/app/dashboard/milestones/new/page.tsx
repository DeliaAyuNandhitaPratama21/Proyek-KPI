"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";

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
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const MILESTONE_PHASES = [
  "Brief",
  "Pengumpulan Materi",
  "Design",
  "Approval",
  "Development",
  "Content",
  "Revisi",
  "Testing",
  "Launch",
];

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

// TOMBOL KEMBALI
function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/milestones"
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

// DROPDOWN
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

export default function NewMilestonePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);

  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT PROYEK AKTIF
  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      let redirecting = false;
      setLoading(true);
      setError("");

      try {
        // VALIDASI ROLE: HANYA ADMIN DAN PROJECT MANAGER BOLEH MENAMBAH MILESTONE
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          redirecting = true;
          router.replace("/login");
          return;
        }

        const { data: userProfile, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (roleError || !userProfile) {
          console.error("Gagal memverifikasi role pengguna:", roleError);
          redirecting = true;
          router.replace("/dashboard/milestones");
          return;
        }

        if (!["Admin", "Project Manager"].includes(userProfile.role)) {
          redirecting = true;
          router.replace("/dashboard/milestones");
          return;
        }

        let projectQuery = supabase
          .from("projects")
          .select("id, project_name")
          .eq("is_archived", false);

        // Project Manager hanya dapat memilih proyek yang menjadi tanggung jawabnya.
        if (userProfile.role === "Project Manager") {
          projectQuery = projectQuery.eq("pic_id", user.id);
        }

        const { data, error } = await projectQuery.order("created_at", {
          ascending: false,
        });

        if (error) {
          console.error("Gagal memuat proyek:", error);
          throw new Error(
            "Data proyek gagal dimuat. Silakan muat ulang halaman.",
          );
        }

        if (!cancelled) {
          setProjects(data || []);
        }
      } catch (err) {
        console.error("Terjadi kesalahan saat memuat proyek:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Data proyek gagal dimuat. Silakan muat ulang halaman.",
          );
        }
      } finally {
        // Jangan tampilkan form ketika pengguna sedang diarahkan karena tidak berhak.
        if (!cancelled && !redirecting) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // SIMPAN MILESTONE
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek terlebih dahulu.");
      return;
    }

    if (!name.trim()) {
      setError("Milestone proyek wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      // VERIFIKASI LOGIN DAN ROLE KEMBALI SAAT MENYIMPAN.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
      }

      const { data: userProfile, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (roleError || !userProfile) {
        throw new Error("Gagal memverifikasi hak akses pengguna.");
      }

      if (!["Admin", "Project Manager"].includes(userProfile.role)) {
        throw new Error("Kamu tidak memiliki izin menambahkan milestone.");
      }

      // PASTIKAN PROYEK AKTIF DAN, UNTUK PM, MERUPAKAN PROYEK MILIKNYA.
      let selectedProjectQuery = supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("is_archived", false);

      if (userProfile.role === "Project Manager") {
        selectedProjectQuery = selectedProjectQuery.eq("pic_id", user.id);
      }

      const { data: selectedProject, error: selectedProjectError } =
        await selectedProjectQuery.maybeSingle();

      if (selectedProjectError || !selectedProject) {
        throw new Error(
          "Proyek tidak ditemukan atau kamu tidak memiliki akses untuk menambahkan milestone pada proyek ini.",
        );
      }

      // AMBIL URUTAN MILESTONE TERAKHIR PADA PROYEK
      const { data: lastMilestone, error: orderError } = await supabase
        .from("milestones")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderError) {
        console.error("Gagal mengambil urutan milestone:", orderError);
        throw new Error("Gagal menentukan urutan tahapan. Silakan coba lagi.");
      }

      const nextSortOrder = Number(lastMilestone?.sort_order ?? 0) + 1;

      // INSERT MILESTONE
      const { error: insertError } = await supabase.from("milestones").insert({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        status,
        sort_order: nextSortOrder,
        client_visible: clientVisible,
      });

      if (insertError) {
        console.error("Gagal menyimpan milestone:", insertError);
        throw new Error("Milestone gagal disimpan. " + insertError.message);
      }

      window.location.assign(
        `/dashboard/milestones?success=created&expanded=${encodeURIComponent(projectId)}`,
      );
    } catch (err) {
      console.error("Terjadi kesalahan saat menyimpan milestone:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan milestone. Silakan coba lagi.",
      );

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* FORM TAMBAH MILESTONE */}
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
            disabled={loading || saving || projects.length === 0}
            required
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
            <p className="text-xs leading-5 text-[#999999]">
              Belum ada proyek aktif. Tambahkan proyek terlebih dahulu sebelum
              membuat tahapan proyek.
            </p>
          )}
        </div>

        {/* NAMA TAHAPAN */}
        <div className={fieldClass}>
          <label htmlFor="name" className={TEXT.label}>
            Milestone <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            required
          >
            <option value="" disabled hidden>
              Pilih milestone proyek
            </option>

            {MILESTONE_PHASES.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </CustomSelect>
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
            placeholder="Tambahkan deskripsi tahapan proyek"
            className={`${TEXT.textarea} min-h-[120px]`}
            disabled={saving}
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
            onClick={(e) => {
              if (!saving) e.currentTarget.showPicker();
            }}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={saving}
            className={`${TEXT.input} !pr-4 cursor-pointer [color-scheme:light]`}
          />
        </div>

        {/* STATUS */}
        <div className={fieldClass}>
          <label htmlFor="status" className={TEXT.label}>
            Status Milestone
          </label>

          <CustomSelect
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={saving}
          >
            <option value="" disabled hidden>
              Pilih status milestone
            </option>
            <option value="Pending">Belum Dimulai</option>
            <option value="In Progress">Berjalan</option>
            <option value="Ditunda">Ditunda</option>
            <option value="Completed">Selesai</option>
          </CustomSelect>
        </div>

        {/* VISIBILITAS KLIEN */}
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
          <input
            id="clientVisible"
            type="checkbox"
            checked={clientVisible}
            onChange={(e) => setClientVisible(e.target.checked)}
            disabled={saving}
            aria-label="Tampilkan kepada Klien"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
          />

          <div>
            <p className="text-sm font-medium text-[#1f1e30]">
              Tampilkan kepada Klien
            </p>

            <p className="mt-1 text-xs leading-5 text-[#777777]">
              Aktifkan untuk menampilkan milestone kepada klien melalui halaman
              publik proyek.
            </p>
          </div>
        </div>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            disabled={loading || saving || projects.length === 0}
            className={TEXT.primaryButton}
          >
            {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>
    </main>
  );
}
