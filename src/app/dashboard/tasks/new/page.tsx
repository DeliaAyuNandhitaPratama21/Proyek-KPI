"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { createActivityLog } from "../../../../lib/activity-log";

type Project = {
  id: string | number;
  project_name: string;
  pic_id: string | null;
};

type Milestone = {
  id: string | number;
  project_id: string | number;
  name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",

  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  textarea:
    "w-full resize-y rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 text-sm leading-6 text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/tasks"
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

export default function NewTaskPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);

  const [currentUserId, setCurrentUserId] = useState("");
  const [userRole, setUserRole] = useState("");

  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [deadline, setDeadline] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT DATA AWAL
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profileError || !profile) {
          setError("Data pengguna tidak ditemukan.");
          return;
        }

        if (profile.role !== "Admin" && profile.role !== "Project Manager") {
          router.push("/dashboard/tasks");
          return;
        }

        const projectsResult = await supabase
          .from("projects")
          .select("id, project_name, pic_id")
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (projectsResult.error) {
          setError(`Data proyek gagal dimuat: ${projectsResult.error.message}`);
          return;
        }

        setProjects((projectsResult.data || []) as Project[]);
        setCurrentUserId(user.id);
        setUserRole(profile.role);
      } catch (loadError) {
        console.error("Load task form error:", loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? `Gagal memuat data: ${loadError.message}`
              : "Terjadi kesalahan saat memuat data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // MEMUAT PENANGGUNG JAWAB BERDASARKAN ANGGOTA PROYEK
  useEffect(() => {
    let cancelled = false;

    async function loadAssignees() {
      setAssignees([]);

      if (!projectId) {
        setLoadingAssignees(false);
        return;
      }

      const selectedProject = projects.find(
        (project) => String(project.id) === String(projectId),
      );

      if (!selectedProject) {
        setLoadingAssignees(false);
        return;
      }

      setLoadingAssignees(true);

      try {
        const { data: memberRows, error: membersError } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId);

        if (membersError) {
          throw new Error(
            `Data anggota proyek gagal dimuat: ${membersError.message}`,
          );
        }

        const memberIds = (memberRows || []).map((member) => member.user_id);
        const allowedUserIds = Array.from(
          new Set(
            [selectedProject.pic_id, ...memberIds].filter(
              (id): id is string => Boolean(id),
            ),
          ),
        );

        if (allowedUserIds.length === 0) {
          if (!cancelled) setAssignees([]);
          return;
        }

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, role")
          .in("id", allowedUserIds)
          .in("role", ["Project Manager", "Staff"])
          .order("name", { ascending: true });

        if (usersError) {
          throw new Error(
            `Data penanggung jawab gagal dimuat: ${usersError.message}`,
          );
        }

        if (!cancelled) {
          setAssignees((usersData || []) as User[]);
        }
      } catch (loadError) {
        console.error("Load project assignees error:", loadError);

        if (!cancelled) {
          setAssignees([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Terjadi kesalahan saat memuat anggota proyek.",
          );
        }
      } finally {
        if (!cancelled) setLoadingAssignees(false);
      }
    }

    loadAssignees();

    return () => {
      cancelled = true;
    };
  }, [projectId, projects, supabase]);

  // MEMUAT TAHAPAN BERDASARKAN PROYEK YANG DIPILIH
  useEffect(() => {
    let cancelled = false;

    async function loadMilestones() {
      setMilestones([]);

      if (!projectId) {
        setLoadingMilestones(false);
        return;
      }

      setLoadingMilestones(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("milestones")
          .select("id, project_id, name")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true });

        if (cancelled) return;

        if (error) {
          setError(`Data tahapan gagal dimuat: ${error.message}`);
          setMilestones([]);
          return;
        }

        setMilestones((data || []) as Milestone[]);
      } catch (loadError) {
        console.error("Load milestones error:", loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? `Data tahapan gagal dimuat: ${loadError.message}`
              : "Terjadi kesalahan saat memuat tahapan proyek.",
          );
          setMilestones([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMilestones(false);
        }
      }
    }

    loadMilestones();

    return () => {
      cancelled = true;
    };
  }, [projectId, supabase]);

  // GANTI PROYEK DAN RESET TAHAPAN
  function handleProjectChange(newProjectId: string) {
    setProjectId(newProjectId);
    setMilestoneId("");
    setAssignedTo("");
    setMilestones([]);
    setAssignees([]);
    setError("");
  }

  // TAMBAH TUGAS
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || loading) return;

    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek.");
      return;
    }

    if (!title.trim()) {
      setError("Nama tugas wajib diisi.");
      return;
    }

    if (loadingMilestones) {
      setError("Tunggu sampai data tahapan selesai dimuat.");
      return;
    }

    if (
      milestoneId &&
      !milestones.some(
        (milestone) =>
          String(milestone.id) === String(milestoneId) &&
          String(milestone.project_id) === String(projectId),
      )
    ) {
      setError("Tahapan yang dipilih tidak sesuai dengan proyek.");
      return;
    }

    // VALIDASI PENANGGUNG JAWAB
    // PM wajib memilih dirinya sendiri atau Staff agar sesuai dengan kebijakan RLS.
    if (userRole === "Project Manager" && !assignedTo) {
      setError("Project Manager wajib memilih penanggung jawab tugas.");
      return;
    }

    if (assignedTo) {
      const selectedUser = assignees.find((user) => user.id === assignedTo);

      const isValidAssignee =
        selectedUser?.role === "Staff" ||
        (userRole === "Admin" && selectedUser?.role === "Project Manager") ||
        (userRole === "Project Manager" &&
          selectedUser?.id === currentUserId &&
          selectedUser?.role === "Project Manager");

      if (!isValidAssignee) {
        setError(
          "Penanggung jawab harus merupakan Project Manager proyek atau Staff yang terdaftar sebagai anggota proyek ini.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          milestone_id: milestoneId || null,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo || null,
          priority,
          status,
          deadline: deadline || null,
          client_visible: clientVisible,
        })
        .select(
          `
          id,
          project_id,
          title,
          assigned_to,
          status,
          priority,
          deadline,
          client_visible
        `,
        )
        .single();

      if (taskError) {
        setError(`Tugas gagal disimpan: ${taskError.message}`);
        return;
      }

      if (!task) {
        setError("Tugas belum berhasil disimpan. Silakan coba lagi.");
        return;
      }

      // ACTIVITY LOG
      // Kegagalan activity log tidak membatalkan penyimpanan tugas.
      try {
        const { error: logError } = await createActivityLog({
          action: "CREATE_TASK",
          description: `Membuat tugas "${task.title}"`,
          projectId: task.project_id,
          metadata: {
            task_id: task.id,
            title: task.title,
            assigned_to: task.assigned_to,
            status: task.status,
            priority: task.priority,
            deadline: task.deadline,
            client_visible: task.client_visible,
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logError) {
        console.error("Activity log exception:", logError);
      }

      window.location.assign(
        `/dashboard/tasks?success=created&expanded=${encodeURIComponent(projectId)}`,
      );
    } catch (submitError) {
      console.error("Create task error:", submitError);

      setError(
        submitError instanceof Error
          ? `Terjadi kesalahan: ${submitError.message}`
          : "Terjadi kesalahan saat menyimpan tugas. Silakan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-5xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        {/* PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="project"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            required
            disabled={loading || saving}
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
              Belum ada proyek aktif. Tambahkan proyek terlebih dahulu sebelum
              membuat tugas.
            </p>
          )}
        </div>

        {/* TAHAPAN PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="milestone" className={TEXT.label}>
            Milestone
          </label>

          <CustomSelect
            id="milestone"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            disabled={!projectId || loadingMilestones || saving}
          >
            <option
              value=""
              disabled
              hidden={Boolean(
                projectId && !loadingMilestones && milestones.length > 0,
              )}
            >
              {!projectId
                ? "Pilih proyek terlebih dahulu"
                : loadingMilestones
                  ? "Memuat milestone proyek..."
                  : milestones.length === 0
                    ? "Belum ada milestone proyek"
                    : "Pilih milestone proyek"}
            </option>

            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </CustomSelect>

          {projectId && !loadingMilestones && milestones.length === 0 && (
            <p className="text-xs leading-5 text-[#777777]">
              Belum ada tahapan proyek untuk proyek ini.
            </p>
          )}
        </div>

        {/* NAMA TUGAS */}
        <div className={fieldClass}>
          <label htmlFor="title" className={TEXT.label}>
            Nama Tugas <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan nama tugas"
            className={TEXT.input}
            required
            disabled={saving}
          />
        </div>

        {/* DESKRIPSI */}
        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi Tugas
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tambahkan deskripsi tugas"
            className={TEXT.textarea}
            disabled={saving}
          />
        </div>

        {/* PENANGGUNG JAWAB */}
        <div className={fieldClass}>
          <label htmlFor="assignedTo" className={TEXT.label}>
            Penanggung Jawab
          </label>

          <CustomSelect
            id="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={loading || loadingAssignees || !projectId || saving}
          >
            <option value="" disabled hidden>
              {!projectId
                ? "Pilih proyek terlebih dahulu"
                : loadingAssignees
                  ? "Memuat anggota proyek..."
                  : assignees.length === 0
                    ? "Belum ada anggota proyek"
                    : "Pilih penanggung jawab"}
            </option>

            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
                {user.id === currentUserId && user.role === "Project Manager"
                  ? " — Saya (Project Manager)"
                  : ` — ${user.role}`}
              </option>
            ))}
          </CustomSelect>

          {projectId && !loadingAssignees && assignees.length === 0 && (
            <p className="text-xs leading-5 text-[#777777]">
              Belum ada Project Manager atau Staff yang terdaftar sebagai anggota proyek ini.
            </p>
          )}
        </div>

        {/* PRIORITAS DAN STATUS */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="priority" className={TEXT.label}>
              Prioritas
            </label>

            <CustomSelect
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
              disabled={saving}
            >
              <option value="" disabled hidden>
                Pilih prioritas
              </option>
              <option value="Low">Rendah</option>
              <option value="Medium">Sedang</option>
              <option value="High">Tinggi</option>
            </CustomSelect>
          </div>

          <div className={fieldClass}>
            <label htmlFor="status" className={TEXT.label}>
              Status Tugas
            </label>

            <CustomSelect
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              disabled={saving}
            >
              <option value="" disabled hidden>
                Pilih status tugas
              </option>
              <option value="Pending">Belum Dimulai</option>
              <option value="In Progress">Berjalan</option>
              <option value="Ditunda">Ditunda</option>
              <option value="Completed">Selesai</option>
            </CustomSelect>
          </div>
        </div>

        {/* TENGGAT WAKTU */}
        <div className={fieldClass}>
          <label htmlFor="deadline" className={TEXT.label}>
            Tenggat Waktu
          </label>

          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onClick={(e) => {
              const input = e.currentTarget;

              if (typeof input.showPicker === "function") {
                input.showPicker();
              }
            }}
            disabled={saving}
            className={`${TEXT.input} !pr-4 cursor-pointer [color-scheme:light]`}
          />
        </div>

        {/* VISIBILITAS KLIEN */}
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
          <input
            id="clientVisible"
            type="checkbox"
            checked={clientVisible}
            onChange={(e) => setClientVisible(e.target.checked)}
            disabled={saving}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
          />

          <div>
            <label
              htmlFor="clientVisible"
              className="cursor-pointer text-sm font-medium text-[#1f1e30]"
            >
              Tampilkan kepada klien
            </label>

            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Tugas ini dapat dilihat klien melalui halaman proyek publik.
            </p>
          </div>
        </div>

        {/* TOMBOL */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/tasks")}
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={
              loading ||
              saving ||
              projects.length === 0 ||
              loadingMilestones ||
              loadingAssignees
            }
            className={TEXT.primaryButton}
          >
            {saving ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>
    </main>
  );
}
