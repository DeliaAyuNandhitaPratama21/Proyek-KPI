"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type SelectHTMLAttributes,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Project = {
  id: string;
  project_name: string;
};

type Milestone = {
  id: string;
  project_id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

type Task = {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  client_visible: boolean;
};

const TEXT = {
  label: "block text-sm font-medium text-[#1f1e30]",

  input:
    "h-[54px] w-full rounded-xl border border-[#EEEEEE] bg-white px-4 text-sm text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:bg-[#f7f7f5] disabled:opacity-60",

  textarea:
    "min-h-[120px] w-full resize-y rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 text-sm leading-6 text-[#1f1e30] outline-none transition-colors placeholder:text-[#999999] focus:border-[#1f1e30] disabled:cursor-not-allowed disabled:bg-[#f7f7f5] disabled:opacity-60",

  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[130px]",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

// TOMBOL KEMBALI
function BackLink() {
  return (
    <div className="mb-8 mt-2">
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

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = String(params.id);

  const [supabase] = useState(() => createClient());

  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [deadline, setDeadline] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // MEMUAT DATA TUGAS, PROYEK, PENGGUNA, DAN HAK AKSES
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

        const allowedRoles = ["Admin", "Project Manager", "Staff"];

        if (!allowedRoles.includes(profile.role)) {
          router.push("/dashboard");
          return;
        }

        const staffMode = profile.role === "Staff";

        setIsStaff(staffMode);
        setUserRole(profile.role);
        setCurrentUserId(user.id);

        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select(
            `
            id,
            project_id,
            milestone_id,
            title,
            description,
            assigned_to,
            priority,
            status,
            deadline,
            client_visible
          `,
          )
          .eq("id", taskId)
          .single();

        if (cancelled) return;

        if (taskError || !taskData) {
          setError(
            taskError
              ? `Data tugas gagal dimuat: ${taskError.message}`
              : "Data tugas tidak ditemukan.",
          );
          return;
        }

        const task = taskData as Task;

        // Staff hanya boleh membuka task yang ditugaskan kepadanya.
        if (staffMode && task.assigned_to !== user.id) {
          setError(
            "Kamu hanya dapat mengubah status tugas yang ditugaskan kepadamu.",
          );
          return;
        }

        // Data proyek dan pengguna hanya diperlukan Admin/PM.
        if (!staffMode) {
          const [projectsResult, usersResult] = await Promise.all([
            supabase
              .from("projects")
              .select("id, project_name")
              .eq("is_archived", false)
              .order("created_at", { ascending: false }),

            supabase
              .from("users")
              .select("id, name, role")
              .in("role", ["Admin", "Project Manager", "Staff"])
              .order("name", { ascending: true }),
          ]);

          if (cancelled) return;

          if (projectsResult.error) {
            setError(
              `Data proyek gagal dimuat: ${projectsResult.error.message}`,
            );
            return;
          }

          if (usersResult.error) {
            setError(
              `Data pengguna gagal dimuat: ${usersResult.error.message}`,
            );
            return;
          }

          const availableUsers = (usersResult.data || []) as User[];

          // Admin: dapat memilih PM dan Staff.
          // PM: hanya dapat memilih dirinya sendiri dan Staff.
          const filteredUsers =
            profile.role === "Admin"
              ? availableUsers.filter(
                  (availableUser) =>
                    availableUser.role === "Project Manager" ||
                    availableUser.role === "Staff",
                )
              : availableUsers.filter(
                  (availableUser) =>
                    availableUser.role === "Staff" ||
                    (availableUser.role === "Project Manager" &&
                      availableUser.id === user.id),
                );

          setProjects((projectsResult.data || []) as Project[]);
          setUsers(filteredUsers);
        }

        setProjectId(task.project_id);
        setMilestoneId(task.milestone_id || "");
        setTitle(task.title || "");
        setDescription(task.description || "");
        setAssignedTo(task.assigned_to || "");
        setPriority(task.priority || "Medium");
        setStatus(task.status || "Pending");
        setDeadline(task.deadline || "");
        setClientVisible(task.client_visible ?? false);
      } catch (loadError) {
        console.error("Load task error:", loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? `Terjadi kesalahan saat memuat data: ${loadError.message}`
              : "Terjadi kesalahan saat memuat data tugas.",
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
  }, [taskId, router, supabase]);

  // MEMUAT TAHAPAN BERDASARKAN PROYEK
  // Staff tidak perlu memuat milestone karena tidak boleh mengubahnya.
  useEffect(() => {
    let cancelled = false;

    async function loadMilestones() {
      setMilestones([]);

      if (isStaff || !projectId) {
        setLoadingMilestones(false);
        return;
      }

      setLoadingMilestones(true);

      try {
        const { data, error } = await supabase
          .from("milestones")
          .select("id, project_id, name")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true });

        if (cancelled) return;

        if (error) {
          setError(`Data tahapan proyek gagal dimuat: ${error.message}`);
          setMilestones([]);
          return;
        }

        setMilestones((data || []) as Milestone[]);
      } catch (loadError) {
        console.error("Load milestones error:", loadError);

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? `Terjadi kesalahan saat memuat tahapan: ${loadError.message}`
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
  }, [projectId, supabase, isStaff]);

  // GANTI PROYEK
  function handleProjectChange(newProjectId: string) {
    setProjectId(newProjectId);
    setMilestoneId("");
    setMilestones([]);
    setError("");
  }

  // UPDATE TUGAS
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    if (!isStaff) {
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
            milestone.id === milestoneId && milestone.project_id === projectId,
        )
      ) {
        setError("Tahapan yang dipilih tidak sesuai dengan proyek.");
        return;
      }

      // VALIDASI PENANGGUNG JAWAB
      if (assignedTo) {
        const selectedUser = users.find((user) => user.id === assignedTo);

        const validAssignee =
          selectedUser?.role === "Staff" ||
          (userRole === "Admin" && selectedUser?.role === "Project Manager") ||
          (userRole === "Project Manager" &&
            selectedUser?.role === "Project Manager" &&
            selectedUser?.id === currentUserId);

        if (!validAssignee) {
          setError("Penanggung jawab tidak sesuai dengan hak akses akun Anda.");
          return;
        }
      }
    }

    if (isStaff && !currentUserId) {
      setError("Identitas pengguna tidak ditemukan. Silakan login kembali.");
      return;
    }

    setSaving(true);

    try {
      // AMBIL DATA LAMA UNTUK ACTIVITY LOG
      const { data: oldTask, error: oldTaskError } = await supabase
        .from("tasks")
        .select(
          `
          id,
          project_id,
          milestone_id,
          title,
          description,
          assigned_to,
          priority,
          status,
          deadline,
          client_visible
        `,
        )
        .eq("id", taskId)
        .single();

      if (oldTaskError || !oldTask) {
        setError(
          oldTaskError
            ? `Data tugas sebelumnya gagal dimuat: ${oldTaskError.message}`
            : "Data tugas sebelumnya tidak ditemukan.",
        );
        return;
      }

      // Staff hanya mengirim kolom status.
      const newTaskData = isStaff
        ? { status }
        : {
            project_id: projectId,
            milestone_id: milestoneId || null,
            title: title.trim(),
            description: description.trim() || null,
            assigned_to: assignedTo || null,
            priority,
            status,
            deadline: deadline || null,
            client_visible: clientVisible,
          };

      // SIMPAN PERUBAHAN TUGAS
      let updateQuery = supabase
        .from("tasks")
        .update(newTaskData)
        .eq("id", taskId);

      // Pengaman tambahan: Staff hanya dapat memperbarui task miliknya.
      if (isStaff) {
        updateQuery = updateQuery.eq("assigned_to", currentUserId);
      }

      const { data: updatedTask, error: updateError } = await updateQuery
        .select(
          `
          id,
          project_id,
          title,
          assigned_to,
          priority,
          status,
          deadline,
          client_visible
        `,
        )
        .single();

      if (updateError) {
        setError(`Tugas gagal diperbarui: ${updateError.message}`);
        return;
      }

      if (!updatedTask) {
        setError("Data tugas tidak ditemukan setelah diperbarui.");
        return;
      }

      // ACTIVITY LOG
      // Kegagalan log tidak membatalkan perubahan tugas.
      try {
        const { error: logError } = await createActivityLog({
          action: "UPDATE_TASK",
          description: isStaff
            ? `Memperbarui status tugas "${updatedTask.title}"`
            : `Mengubah tugas "${updatedTask.title}"`,
          projectId: updatedTask.project_id,
          metadata: {
            task_id: updatedTask.id,
            old_data: {
              project_id: oldTask.project_id,
              milestone_id: oldTask.milestone_id,
              title: oldTask.title,
              description: oldTask.description,
              assigned_to: oldTask.assigned_to,
              priority: oldTask.priority,
              status: oldTask.status,
              deadline: oldTask.deadline,
              client_visible: oldTask.client_visible,
            },
            new_data: newTaskData,
          },
        });

        if (logError) {
          console.error("Activity log error:", logError);
        }
      } catch (logError) {
        console.error("Activity log exception:", logError);
      }

      window.location.assign(
        `/dashboard/tasks?success=updated&expanded=${encodeURIComponent(projectId)}`,
      );
    } catch (submitError) {
      console.error("Update task error:", submitError);

      setError(
        submitError instanceof Error
          ? `Terjadi kesalahan: ${submitError.message}`
          : "Terjadi kesalahan saat memperbarui tugas.",
      );
    } finally {
      setSaving(false);
    }
  }

  // LOADING STATE
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <BackLink />

        <div className={formClass}>
          <p className="text-sm text-[#777777]">Memuat data tugas...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      <BackLink />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-200 bg-[#fce2d3] px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        {!isStaff && (
          <>
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
                disabled={saving}
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
                placeholder="Jelaskan pekerjaan yang perlu dilakukan..."
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
                disabled={saving}
              >
                <option value="" disabled hidden>
                  Pilih penanggung jawab
                </option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.id === currentUserId &&
                    user.role === "Project Manager"
                      ? " — Saya (Project Manager)"
                      : ` — ${user.role}`}
                  </option>
                ))}
              </CustomSelect>
            </div>
          </>
        )}

        {/* PRIORITAS DAN STATUS */}
        <div
          className={`grid grid-cols-1 gap-5 ${
            isStaff ? "md:grid-cols-1" : "md:grid-cols-2"
          }`}
        >
          {!isStaff && (
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
          )}

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
              <option value="Completed">Selesai</option>
            </CustomSelect>
          </div>
        </div>

        {!isStaff && (
          <>
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
                className={`${TEXT.input} cursor-pointer pr-4 [color-scheme:light]`}
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
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
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
          </>
        )}

        {/* TOMBOL */}
        <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:justify-end">
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
            disabled={saving || (!isStaff && loadingMilestones)}
            className={TEXT.primaryButton}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1f1e30]/30 border-t-[#1f1e30]" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
