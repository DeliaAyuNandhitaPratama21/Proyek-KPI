"use client";

import {
  FormEvent,
  useEffect,
  useState,
  type SelectHTMLAttributes,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  textarea:
    "w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

  primaryButton:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57] disabled:cursor-not-allowed disabled:opacity-50",

  secondaryButton:
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",

  dangerButton:
    "inline-flex items-center justify-center rounded-xl border border-red-500/20 px-5 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50",
};

const fieldClass = "flex flex-col gap-2";

const formClass =
  "flex max-w-4xl flex-col gap-6 rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-5 sm:p-8";

// Tombol kembali
function BackLink() {
  const router = useRouter();

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => router.back()}
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
      </button>
    </div>
  );
}

// Header halaman
function PageHeader() {
  return (
    <header className="mb-8 mt-2">
      <BackLink />

      <h1 className={TEXT.pageTitle}>Edit Task</h1>

      <p className={TEXT.subtitle}>
        Perbarui informasi pekerjaan dan pengaturannya.
      </p>
    </header>
  );
}

// Ikon panah dropdown
function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
  const supabase = createClient();

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

  const [loading, setLoading] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // LOAD DATA + ROLE CHECK
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

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
        router.push("/dashboard");
        return;
      }

      const allowedRoles = ["Admin", "Project Manager", "Staff"];

      if (!allowedRoles.includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      const [projectsResult, usersResult, taskResult] = await Promise.all([
        supabase
          .from("projects")
          .select("id, project_name")
          .order("created_at", { ascending: false }),

        supabase.from("users").select("id, name, role").order("name"),

        supabase
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
          .single(),
      ]);

      if (cancelled) return;

      if (projectsResult.error) {
        setError("Data proyek gagal dimuat.");
        setLoading(false);
        return;
      }

      if (usersResult.error) {
        setError("Data pengguna gagal dimuat.");
        setLoading(false);
        return;
      }

      if (taskResult.error) {
        setError("Data task gagal dimuat.");
        setLoading(false);
        return;
      }

      const task = taskResult.data as Task;

      setProjects(projectsResult.data || []);
      setUsers(usersResult.data || []);

      setProjectId(task.project_id);
      setMilestoneId(task.milestone_id || "");
      setTitle(task.title || "");
      setDescription(task.description || "");
      setAssignedTo(task.assigned_to || "");
      setPriority(task.priority || "Medium");
      setStatus(task.status || "Pending");
      setDeadline(task.deadline || "");
      setClientVisible(task.client_visible ?? false);

      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, router]);

  // LOAD MILESTONES BERDASARKAN PROYEK
  useEffect(() => {
    let cancelled = false;

    async function loadMilestones() {
      if (!projectId) {
        setMilestones([]);
        setMilestoneId("");
        setLoadingMilestones(false);
        return;
      }

      setLoadingMilestones(true);

      const { data, error } = await supabase
        .from("milestones")
        .select("id, project_id, name")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError("Data milestone gagal dimuat.");
        setMilestones([]);
        setLoadingMilestones(false);
        return;
      }

      setMilestones(data || []);
      setLoadingMilestones(false);
    }

    loadMilestones();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // UPDATE TASK
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    if (!projectId) {
      setError("Silakan pilih proyek.");
      setSaving(false);
      return;
    }

    if (!title.trim()) {
      setError("Nama task wajib diisi.");
      setSaving(false);
      return;
    }

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

    if (oldTaskError) {
      setError(oldTaskError.message);
      setSaving(false);
      return;
    }

    const newTaskData = {
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

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(newTaskData)
      .eq("id", taskId)
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
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const { error: logError } = await createActivityLog({
      action: "UPDATE_TASK",
      description: `Mengubah task "${updatedTask.title}"`,
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

    router.push("/dashboard/tasks");
    router.refresh();
  }

  // DELETE TASK
  async function handleDelete() {
    if (saving) return;

    const confirmed = window.confirm("Yakin ingin menghapus task ini?");

    if (!confirmed) return;

    setSaving(true);
    setError("");

    const { data: taskToDelete, error: fetchError } = await supabase
      .from("tasks")
      .select("id, project_id, title, assigned_to, priority, status")
      .eq("id", taskId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    const { error: logError } = await createActivityLog({
      action: "DELETE_TASK",
      description: `Menghapus task "${taskToDelete.title}"`,
      projectId: taskToDelete.project_id,
      metadata: {
        task_id: taskToDelete.id,
        title: taskToDelete.title,
        assigned_to: taskToDelete.assigned_to,
        priority: taskToDelete.priority,
        status: taskToDelete.status,
      },
    });

    if (logError) {
      console.error("Activity log error:", logError);
    }

    router.push("/dashboard/tasks");
    router.refresh();
  }

  // LOADING STATE
  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <PageHeader />

        <div className={formClass}>
          <p className="text-sm text-zinc-400">Memuat data task...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      <PageHeader />

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        {/* PROJECT */}
        <div className={fieldClass}>
          <label htmlFor="project" className={TEXT.label}>
            Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="project"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setMilestoneId("");
            }}
            required
            disabled={saving}
          >
            <option value="">Pilih proyek</option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* MILESTONE */}
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
            <option value="">
              {!projectId
                ? "Pilih proyek terlebih dahulu"
                : loadingMilestones
                  ? "Memuat milestone..."
                  : milestones.length === 0
                    ? "Belum ada milestone"
                    : "Pilih milestone"}
            </option>

            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* TITLE */}
        <div className={fieldClass}>
          <label htmlFor="title" className={TEXT.label}>
            Nama Task <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Mengembangkan halaman utama"
            className={TEXT.input}
            required
            disabled={saving}
          />
        </div>

        {/* DESCRIPTION */}
        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi Task
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

        {/* ASSIGNED TO */}
        <div className={fieldClass}>
          <label htmlFor="assignedTo" className={TEXT.label}>
            Penanggung Jawab (PIC)
          </label>

          <CustomSelect
            id="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={saving}
          >
            <option value="">Pilih penanggung jawab</option>

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* PRIORITY + STATUS */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="priority" className={TEXT.label}>
              Prioritas
            </label>

            <CustomSelect
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={saving}
            >
              <option value="Low">Rendah</option>
              <option value="Medium">Sedang</option>
              <option value="High">Tinggi</option>
            </CustomSelect>
          </div>

          <div className={fieldClass}>
            <label htmlFor="status" className={TEXT.label}>
              Status Task
            </label>

            <CustomSelect
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">Dalam Proses</option>
              <option value="Completed">Selesai</option>
            </CustomSelect>
          </div>
        </div>

        {/* DEADLINE */}
        <div className={fieldClass}>
          <label htmlFor="deadline" className={TEXT.label}>
            Tenggat Waktu
          </label>

          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
            className={`${TEXT.input} pr-11 [color-scheme:dark]`}
          />
        </div>

        {/* CLIENT VISIBILITY */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111111]/70 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="clientVisible"
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              disabled={saving}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A] disabled:cursor-not-allowed"
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Tampilkan kepada klien
              </span>

              <span className="mt-1 block text-sm leading-6 text-zinc-400">
                Task ini dapat dilihat klien melalui halaman proyek publik.
              </span>
            </span>
          </label>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className={TEXT.dangerButton}
          >
            Hapus Task
          </button>

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
              disabled={saving || projects.length === 0}
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
        </div>
      </form>
    </main>
  );
}
