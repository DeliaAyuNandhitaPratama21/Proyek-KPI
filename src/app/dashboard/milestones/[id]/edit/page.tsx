"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";

type Project = {
  id: string;
  project_name: string;
};

type MilestoneData = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  sort_order: number | null;
  client_visible: boolean | null;
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

// DROPDOWN CUSTOM
function CustomSelect({
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
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

  const milestoneId = String(params.id);

  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);

  const [projectId, setProjectId] = useState("");
  const [originalProjectId, setOriginalProjectId] = useState("");
  const [originalSortOrder, setOriginalSortOrder] = useState(1);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT DATA MILESTONE DAN PROYEK
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      let redirecting = false;

      setLoading(true);
      setError("");

      try {
        // VALIDASI ROLE: HANYA ADMIN DAN PROJECT MANAGER
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

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

        if (cancelled) return;

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

        const [milestoneResult, projectsResult] = await Promise.all([
          supabase
            .from("milestones")
            .select(
              "id, project_id, name, description, due_date, status, sort_order, client_visible",
            )
            .eq("id", milestoneId)
            .single(),

          (async () => {
            let projectsQuery = supabase
              .from("projects")
              .select("id, project_name")
              .eq("is_archived", false)
              .order("created_at", { ascending: false });

            if (userProfile.role === "Project Manager") {
              projectsQuery = projectsQuery.eq("pic_id", user.id);
            }

            return await projectsQuery;
          })(),
        ]);

        if (cancelled) return;

        if (milestoneResult.error || !milestoneResult.data) {
          console.error("Gagal memuat milestone:", milestoneResult.error);

          setError(
            "Data tahapan proyek tidak ditemukan atau kamu tidak memiliki akses.",
          );
          return;
        }

        if (projectsResult.error) {
          console.error("Gagal memuat proyek:", projectsResult.error);

          setError("Data proyek gagal dimuat. Silakan muat ulang halaman.");
          return;
        }

        const milestone = milestoneResult.data as MilestoneData;
        const allowedProjects = (projectsResult.data || []) as Project[];

        if (
          !allowedProjects.some(
            (project) => String(project.id) === String(milestone.project_id),
          )
        ) {
          redirecting = true;
          router.replace("/dashboard/milestones");
          return;
        }

        setProjectId(milestone.project_id);
        setOriginalProjectId(milestone.project_id);
        setOriginalSortOrder(milestone.sort_order ?? 1);

        setName(milestone.name || "");
        setDescription(milestone.description || "");
        setDueDate(milestone.due_date || "");
        setStatus(milestone.status || "Pending");
        setClientVisible(milestone.client_visible ?? false);

        setProjects(allowedProjects);
      } catch (err) {
        console.error("Terjadi kesalahan saat memuat data milestone:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Data tahapan proyek gagal dimuat. Silakan muat ulang halaman.",
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
  }, [milestoneId, router, supabase]);

  // SIMPAN PERUBAHAN
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || deleting) return;

    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek terlebih dahulu.");
      return;
    }

    if (!name.trim()) {
      setError("Nama tahapan proyek wajib diisi.");
      return;
    }

    if (!projects.some((project) => project.id === projectId)) {
      setError("Proyek yang dipilih tidak valid.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        !["Admin", "Project Manager"].includes(profile.role)
      ) {
        throw new Error("Kamu tidak memiliki izin mengedit milestone.");
      }

      if (profile.role === "Project Manager") {
        const { data: ownedProjects, error: ownershipError } = await supabase
          .from("projects")
          .select("id")
          .eq("pic_id", user.id)
          .eq("is_archived", false)
          .in("id", [originalProjectId, projectId]);

        if (ownershipError) {
          throw new Error("Gagal memverifikasi kepemilikan proyek.");
        }

        const ownedIds = new Set(
          (ownedProjects ?? []).map((item) => String(item.id)),
        );
        if (
          !ownedIds.has(String(originalProjectId)) ||
          !ownedIds.has(String(projectId))
        ) {
          throw new Error(
            "Kamu hanya dapat mengedit milestone pada proyek yang menjadi tanggung jawabmu.",
          );
        }
      }

      let nextSortOrder = originalSortOrder;

      // JIKA PROYEK BERUBAH, TENTUKAN URUTAN BARU
      if (projectId !== originalProjectId) {
        const { data: lastMilestone, error: orderError } = await supabase
          .from("milestones")
          .select("sort_order")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orderError) {
          console.error("Gagal menentukan urutan milestone:", orderError);

          throw new Error(
            "Gagal menentukan urutan tahapan pada proyek tujuan.",
          );
        }

        nextSortOrder = Number(lastMilestone?.sort_order ?? 0) + 1;
      }

      // UPDATE DATA MILESTONE
      // SELECT DIGUNAKAN UNTUK MEMASTIKAN ADA BARIS YANG DIPERBARUI.
      const { data: updatedMilestone, error: updateError } = await supabase
        .from("milestones")
        .update({
          project_id: projectId,
          name: name.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          status,
          sort_order: nextSortOrder,
          client_visible: clientVisible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", milestoneId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Gagal memperbarui milestone:", updateError);

        throw new Error(
          "Tahapan proyek gagal diperbarui. " + updateError.message,
        );
      }

      if (!updatedMilestone) {
        throw new Error(
          "Perubahan tidak berhasil. Milestone mungkin tidak ditemukan atau kamu tidak memiliki izin untuk mengubahnya.",
        );
      }

      window.location.assign(
        `/dashboard/milestones?success=updated&expanded=${encodeURIComponent(projectId)}`,
      );
    } catch (err) {
      console.error("Terjadi kesalahan saat memperbarui milestone:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memperbarui tahapan proyek. Silakan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  // HAPUS MILESTONE
  async function handleDelete() {
    if (saving || deleting) return;

    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus tahapan proyek ini?",
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        !["Admin", "Project Manager"].includes(profile.role)
      ) {
        throw new Error("Kamu tidak memiliki izin menghapus milestone.");
      }

      if (profile.role === "Project Manager") {
        const { data: ownedProject, error: ownershipError } = await supabase
          .from("projects")
          .select("id")
          .eq("id", originalProjectId)
          .eq("pic_id", user.id)
          .eq("is_archived", false)
          .maybeSingle();

        if (ownershipError || !ownedProject) {
          throw new Error(
            "Kamu hanya dapat menghapus milestone pada proyek yang menjadi tanggung jawabmu.",
          );
        }
      }

      // SELECT DIGUNAKAN UNTUK MEMASTIKAN ADA BARIS YANG DIHAPUS.
      const { data: deletedMilestone, error: deleteError } = await supabase
        .from("milestones")
        .delete()
        .eq("id", milestoneId)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        console.error("Gagal menghapus milestone:", deleteError);

        throw new Error("Tahapan proyek gagal dihapus. " + deleteError.message);
      }

      if (!deletedMilestone) {
        throw new Error(
          "Milestone tidak berhasil dihapus. Data mungkin tidak ditemukan atau kamu tidak memiliki izin untuk menghapusnya.",
        );
      }

      router.push(`/dashboard/milestones?success=deleted&expanded=${originalProjectId}`);
      router.refresh();
    } catch (err) {
      console.error("Terjadi kesalahan saat menghapus milestone:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus tahapan proyek. Silakan coba lagi.",
      );
    } finally {
      setDeleting(false);
    }
  }

  // LOADING STATE
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <BackLink />

        <div className={formClass}>
          <p className="text-sm text-[#777777]">
            Memuat data tahapan proyek...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {/* PESAN KESALAHAN */}
      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* FORM EDIT MILESTONE */}
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
            disabled={saving || deleting || projects.length === 0}
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
              Tidak ada data proyek yang tersedia.
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
            required
            disabled={saving || deleting}
          >
            <option value="" disabled hidden>
              Pilih milestone proyek
            </option>

            {name && !MILESTONE_PHASES.includes(name) && (
              <option value={name}>{name} (nama lama)</option>
            )}

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
            placeholder="Jelaskan tahapan pengerjaan proyek..."
            rows={4}
            disabled={saving || deleting}
            className={`${TEXT.textarea} min-h-[120px]`}
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
              if (!saving && !deleting) {
                e.currentTarget.showPicker();
              }
            }}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={saving || deleting}
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
            disabled={saving || deleting}
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
            disabled={saving || deleting}
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
        <div className="flex w-full justify-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard/milestones")}
              disabled={saving || deleting}
              className={TEXT.secondaryButton}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving || deleting || projects.length === 0}
              className={TEXT.primaryButton}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
