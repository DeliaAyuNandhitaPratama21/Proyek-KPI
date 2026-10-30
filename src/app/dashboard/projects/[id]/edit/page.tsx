"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectHTMLAttributes } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { createActivityLog } from "../../../../../lib/activity-log";

type Client = {
  id: string;
  company_name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

type ProjectStatus = {
  id: string;
  name: string;
};

type Project = {
  client_id: string;
  project_name: string;
  project_type: string | null;
  description: string | null;
  pic: string | null;
  start_date: string | null;
  deadline: string | null;
  status_id: string;
  progress: number;
  public_token: string | null;
  public_visibility: boolean;
};

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  subtitle: "mt-1 text-sm leading-6 text-zinc-400",
  sectionTitle: "text-lg font-semibold text-white",
  label: "block text-sm font-medium text-white",

  input:
    "h-[54px] w-full rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] pl-4 pr-12 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-50",

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

function BackLink() {
  return (
    <div className="mb-5">
      <Link
        href="/dashboard/projects"
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
        className={`${TEXT.input} appearance-none ${className || ""}`}
      >
        {children}
      </select>

      <SelectArrow />
    </div>
  );
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const projectId = String(params.id);

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);

  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("Website");
  const [description, setDescription] = useState("");
  const [pic, setPic] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [statusId, setStatusId] = useState("");
  const [progress, setProgress] = useState(0);

  const [publicToken, setPublicToken] = useState("");
  const [publicVisibility, setPublicVisibility] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        router.push("/dashboard");
        return;
      }

      const allowedRoles = ["Admin", "Project Manager", "Staff"];

      if (!allowedRoles.includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      const [projectResult, clientsResult, usersResult, statusesResult] =
        await Promise.all([
          supabase.from("projects").select("*").eq("id", projectId).single(),

          supabase
            .from("clients")
            .select("id, company_name")
            .eq("status", "Active")
            .order("company_name"),

          supabase.from("users").select("id, name, role").order("name"),

          supabase
            .from("project_statuses")
            .select("id, name")
            .order("sort_order"),
        ]);

      if (projectResult.error) {
        setError(projectResult.error.message);
        setLoading(false);
        return;
      }

      if (clientsResult.error) {
        setError(clientsResult.error.message);
        setLoading(false);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        setLoading(false);
        return;
      }

      if (statusesResult.error) {
        setError(statusesResult.error.message);
        setLoading(false);
        return;
      }

      const project = projectResult.data as Project;

      setClients(clientsResult.data || []);
      setUsers(usersResult.data || []);
      setStatuses(statusesResult.data || []);

      setClientId(project.client_id);
      setProjectName(project.project_name);
      setProjectType(project.project_type || "Website");
      setDescription(project.description || "");
      setPic(project.pic || "");
      setStartDate(project.start_date || "");
      setDeadline(project.deadline || "");
      setStatusId(project.status_id);
      setProgress(project.progress || 0);

      setPublicToken(project.public_token || "");
      setPublicVisibility(project.public_visibility ?? true);

      setLoading(false);
    }

    loadData();

    // supabase dan router merupakan dependency dari halaman ini.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    if (!clientId) {
      setError("Silakan pilih klien.");
      setSaving(false);
      return;
    }

    if (!projectName.trim()) {
      setError("Nama proyek wajib diisi.");
      setSaving(false);
      return;
    }

    if (!statusId) {
      setError("Silakan pilih status proyek.");
      setSaving(false);
      return;
    }

    if (startDate && deadline && deadline < startDate) {
      setError("Tenggat waktu tidak boleh sebelum tanggal mulai.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        client_id: clientId,
        project_name: projectName.trim(),
        project_type: projectType || null,
        description: description.trim() || null,
        pic: pic || null,
        start_date: startDate || null,
        deadline: deadline || null,
        status_id: statusId,
        progress,
        public_visibility: publicVisibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // PENTING:
    // Jangan panggil createActivityLog() di sini.
    // Trigger Supabase trigger_project_activity sudah mencatat UPDATE PROJECT.

    router.push("/dashboard/projects");
    router.refresh();
  }

  async function handleRegenerateToken() {
    const confirmed = window.confirm(
      "Buat ulang token publik?\n\nLink publik lama akan langsung tidak berlaku.",
    );

    if (!confirmed) return;

    setRegenerating(true);
    setError("");

    const newToken = crypto.randomUUID().replaceAll("-", "");

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        public_token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateError) {
      setError(updateError.message);
      setRegenerating(false);
      return;
    }

    setPublicToken(newToken);

    // Trigger Supabase sudah mencatat UPDATE PROJECT.
    // Pencatatan khusus token di bawah ini masih dipertahankan.
    // Perhatikan bahwa ini dapat menghasilkan dua aktivitas untuk regenerasi token.
    const { error: logError } = await createActivityLog({
      action: "REGENERATE_PROJECT_TOKEN",
      description: `Membuat ulang public token project "${projectName}".`,
      projectId,
      metadata: {
        project_name: projectName,
      },
    });

    if (logError) {
      console.error("Gagal mencatat aktivitas pembuatan token:", logError);
    }

    setRegenerating(false);

    window.alert("Token publik berhasil dibuat ulang.");
  }

  function getPublicLink() {
    if (!publicToken) return "";

    if (typeof window === "undefined") {
      return `/project/${publicToken}`;
    }

    return `${window.location.origin}/project/${publicToken}`;
  }

  async function handleCopyLink() {
    const link = getPublicLink();

    if (!link) {
      window.alert("Token publik belum tersedia.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      window.alert("Tautan publik berhasil disalin.");
    } catch {
      window.alert("Gagal menyalin tautan publik.");
    }
  }

  function handleOpenLink() {
    const link = getPublicLink();

    if (!link) {
      window.alert("Token publik belum tersedia.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <header className="mb-8 mt-2">
          <BackLink />

          <h1 className={TEXT.pageTitle}>Edit Proyek</h1>

          <p className={TEXT.subtitle}>
            Perbarui informasi dan pengaturan proyek.
          </p>
        </header>

        <div className="max-w-4xl rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80 p-6">
          <p className="text-sm text-zinc-400">Memuat data proyek...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      <header className="mb-8 mt-2">
        <BackLink />

        <h1 className={TEXT.pageTitle}>Edit Proyek</h1>

        <p className={TEXT.subtitle}>
          Perbarui informasi, progres, dan pengaturan pemantauan proyek.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        <div className={fieldClass}>
          <label htmlFor="client" className={TEXT.label}>
            Klien <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Pilih klien</option>

            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </CustomSelect>

          {clients.length === 0 && (
            <p className="text-xs leading-5 text-zinc-500">
              Belum ada klien aktif. Periksa kembali data klien terlebih dahulu.
            </p>
          )}
        </div>

        <div className={fieldClass}>
          <label htmlFor="projectName" className={TEXT.label}>
            Nama Proyek <span className="text-red-500">*</span>
          </label>

          <input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Masukkan nama proyek"
            className={TEXT.input}
            required
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="projectType" className={TEXT.label}>
            Jenis Proyek
          </label>

          <CustomSelect
            id="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="Website">Website</option>
            <option value="Landing Page">Landing Page</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="Company Profile">Company Profile</option>
            <option value="Web Application">Aplikasi Web</option>
          </CustomSelect>
        </div>

        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi Proyek
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Jelaskan gambaran umum proyek..."
            className={TEXT.textarea}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="pic" className={TEXT.label}>
            Penanggung Jawab (PIC)
          </label>

          <CustomSelect
            id="pic"
            value={pic}
            onChange={(e) => setPic(e.target.value)}
          >
            <option value="">Pilih penanggung jawab</option>

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="startDate" className={TEXT.label}>
              Tanggal Mulai
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={deadline || undefined}
              className={TEXT.input}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="deadline" className={TEXT.label}>
              Tenggat Waktu
            </label>

            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={startDate || undefined}
              className={TEXT.input}
            />
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="status" className={TEXT.label}>
            Status Proyek <span className="text-red-500">*</span>
          </label>

          <CustomSelect
            id="status"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
            size={1}
          >
            <option value="">Pilih status proyek</option>

            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </CustomSelect>
        </div>

        <div className={fieldClass}>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="progress" className={TEXT.label}>
              Progres Proyek
            </label>

            <span className="text-sm font-semibold tabular-nums text-[#B7FE1A]">
              {progress}%
            </span>
          </div>

          <input
            id="progress"
            type="range"
            min="0"
            max="100"
            step="25"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full cursor-pointer accent-[#B7FE1A]"
          />

          <div className="flex justify-between text-xs text-zinc-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#2a2a2a]">
          <div className="border-b border-[#2a2a2a] px-5 py-4">
            <h2 className="text-base font-semibold text-white">
              Tautan Pemantauan Klien
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Kelola akses klien untuk memantau informasi proyek melalui tautan
              publik tanpa perlu login.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="publicVisibility"
                type="checkbox"
                checked={publicVisibility}
                onChange={(e) => setPublicVisibility(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
              />

              <div>
                <p className="text-sm font-medium text-white">
                  Aktifkan Halaman Publik
                </p>

                <p className="mt-1 text-sm leading-5 text-zinc-400">
                  Klien dapat melihat informasi proyek melalui tautan unik
                  selama akses publik diaktifkan.
                </p>
              </div>
            </label>

            <div className="h-px bg-[#262626]" />

            {publicToken ? (
              <div className="space-y-4">
                <div className={fieldClass}>
                  <label htmlFor="publicLink" className={TEXT.label}>
                    Tautan Publik
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="publicLink"
                      value={getPublicLink()}
                      readOnly
                      className={`${TEXT.input} min-w-0 flex-1 text-zinc-400`}
                    />

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex h-[54px] shrink-0 items-center justify-center rounded-xl border border-[#2a2a2a] px-5 text-sm font-medium text-white transition-colors hover:border-[#B7FE1A] hover:text-[#B7FE1A]"
                    >
                      Salin Tautan
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    disabled={!publicVisibility}
                    className="inline-flex items-center justify-center rounded-xl border border-[#2a2a2a] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#B7FE1A] hover:text-[#B7FE1A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buka Halaman Publik
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={regenerating}
                    className="inline-flex items-center justify-center rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {regenerating ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                        Membuat Ulang...
                      </>
                    ) : (
                      "Buat Ulang Token"
                    )}
                  </button>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.04] p-4">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>

                  <div>
                    <p className="text-sm font-medium text-yellow-400">
                      Keamanan Tautan
                    </p>

                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Membuat ulang token akan langsung menonaktifkan tautan
                      publik lama. Bagikan tautan baru kepada klien setelah
                      proses selesai.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#111111]/70 p-4">
                <p className="text-sm leading-6 text-zinc-400">
                  Proyek ini belum memiliki token publik. Buat token untuk
                  menghasilkan tautan pemantauan klien.
                </p>

                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className={`${TEXT.primaryButton} mt-4`}
                >
                  {regenerating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Membuat Tautan...
                    </>
                  ) : (
                    "Buat Tautan Publik"
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-[#262626] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/projects")}
            disabled={saving}
            className={TEXT.secondaryButton}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving || clients.length === 0 || statuses.length === 0}
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