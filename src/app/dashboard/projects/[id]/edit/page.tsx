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
  pic_id: string | null;
  pic: string | null;
  start_date: string | null;
  deadline: string | null;
  status_id: string | number | null;
  progress: number;
  public_token: string | null;
  public_visibility: boolean;
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
const formClass =
  "flex max-w-5xl flex-col gap-6 rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-[0_2px_10px_rgba(31,30,48,0.04)] sm:p-8";

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/projects"
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

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const projectId = String(params.id);

  const [userRole, setUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);

  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [description, setDescription] = useState("");
  const [picId, setPicId] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [statusId, setStatusId] = useState("");

  const [publicToken, setPublicToken] = useState("");
  const [publicVisibility, setPublicVisibility] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  // LOAD PROJECT DATA
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
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, name, role")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profileError || !profile) {
          router.replace("/dashboard");
          return;
        }

        const role = String(profile.role || "").trim();

        if (!["Admin", "Project Manager"].includes(role)) {
          router.replace("/dashboard");
          return;
        }

        const [
          projectResult,
          clientsResult,
          managersResult,
          staffResult,
          statusesResult,
          membersResult,
        ] = await Promise.all([
          supabase.from("projects").select("*").eq("id", projectId).single(),

          supabase
            .from("clients")
            .select("id, company_name, status")
            .order("company_name"),

          supabase
            .from("users")
            .select("id, name, role")
            .eq("role", "Project Manager")
            .order("name"),

          supabase
            .from("users")
            .select("id, name, role")
            .eq("role", "Staff")
            .order("name"),

          supabase
            .from("project_statuses")
            .select("id, name")
            .order("sort_order"),

          supabase
            .from("project_members")
            .select("user_id")
            .eq("project_id", projectId),
        ]);

        if (cancelled) return;

        if (projectResult.error) throw new Error(projectResult.error.message);
        if (clientsResult.error) throw new Error(clientsResult.error.message);
        if (managersResult.error) throw new Error(managersResult.error.message);
        if (staffResult.error) throw new Error(staffResult.error.message);
        if (statusesResult.error) throw new Error(statusesResult.error.message);
        if (membersResult.error) throw new Error(membersResult.error.message);

        const project = projectResult.data as Project;

        // PM hanya boleh mengedit proyek yang pic_id-nya adalah dirinya.
        if (role === "Project Manager" && project.pic_id !== user.id) {
          router.replace("/dashboard/projects");
          return;
        }

        setUserRole(role);
        setCurrentUserId(user.id);

        // Tampilkan semua klien aktif dan tetap sertakan klien yang
        // sedang digunakan proyek meskipun statusnya sudah tidak aktif.
        setClients(
          (clientsResult.data || []).filter(
            (client) =>
              client.status === "Active" || client.id === project.client_id,
          ),
        );
        setProjectManagers(managersResult.data || []);
        setStaffUsers(staffResult.data || []);
        console.log("HASIL QUERY STAFF:", staffResult.data);
        console.log("ERROR QUERY STAFF:", staffResult.error);
        console.log("HASIL QUERY MEMBERS:", membersResult.data);
        console.log("ERROR QUERY MEMBERS:", membersResult.error);
        setStatuses(statusesResult.data || []);

        setClientId(String(project.client_id || ""));
        setProjectName(project.project_name || "");
        setProjectType(project.project_type || "");
        setDescription(project.description || "");
        setPicId(project.pic_id || "");
        const existingMemberIds = (membersResult.data || []).map(
          (member) => member.user_id,
        );
        // Fallback untuk proyek lama yang belum memiliki data anggota.
        setSelectedStaffIds(
          existingMemberIds.length > 0
            ? existingMemberIds
            : project.pic
              ? [project.pic]
              : [],
        );
        setStartDate(project.start_date || "");
        setDeadline(project.deadline || "");
        setStatusId(project.status_id == null ? "" : String(project.status_id));
        setPublicToken(project.public_token || "");
        setPublicVisibility(project.public_visibility ?? true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data proyek.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!projectId || projectId === "undefined") {
      setError("ID proyek tidak valid.");
      setLoading(false);
    } else {
      loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [projectId, router, supabase]);

  // UPDATE PROJECT
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      if (!clientId) throw new Error("Silakan pilih klien.");
      if (!projectName.trim()) throw new Error("Nama proyek wajib diisi.");
      if (!statusId) throw new Error("Silakan pilih status proyek.");

      if (!statuses.some((status) => String(status.id) === statusId)) {
        throw new Error("Status proyek tidak valid.");
      }

      if (startDate && deadline && deadline < startDate) {
        throw new Error("Tenggat waktu tidak boleh sebelum tanggal mulai.");
      }

      // PM mempertahankan dirinya sebagai penanggung jawab proyek.
      const finalPicId = userRole === "Project Manager" ? currentUserId : picId;

      if (!finalPicId) {
        throw new Error("Silakan pilih Project Manager.");
      }

      if (
        userRole === "Admin" &&
        !projectManagers.some((manager) => manager.id === finalPicId)
      ) {
        throw new Error("Project Manager yang dipilih tidak valid.");
      }

      if (
        selectedStaffIds.some(
          (id) => !staffUsers.some((staff) => staff.id === id),
        )
      ) {
        throw new Error("Staff yang dipilih tidak valid.");
      }

      const { data, error: updateError } = await supabase
        .from("projects")
        .update({
          client_id: clientId,
          project_name: projectName.trim(),
          project_type: projectType || null,
          description: description.trim() || null,

          // PM penanggung jawab proyek
          pic_id: finalPicId,

          // Staff pertama yang dipilih menjadi PIC Staff utama.
          pic: selectedStaffIds[0] || null,

          start_date: startDate || null,
          deadline: deadline || null,
          status_id: Number(statusId),
          public_visibility: publicVisibility,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select("id")
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);

      if (!data) {
        throw new Error(
          "Proyek tidak ditemukan atau Anda tidak memiliki izin untuk mengubahnya.",
        );
      }

      // Sinkronkan anggota Staff proyek dengan pilihan terbaru.
      const { error: deleteMembersError } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId);

      if (deleteMembersError) {
        throw new Error(
          "Data proyek diperbarui, tetapi anggota Staff gagal diperbarui: " +
            deleteMembersError.message,
        );
      }

      if (selectedStaffIds.length > 0) {
        const members = selectedStaffIds.map((staffId) => ({
          project_id: Number(projectId),
          user_id: staffId,
        }));

        const { error: insertMembersError } = await supabase
          .from("project_members")
          .insert(members);

        if (insertMembersError) {
          throw new Error(
            "Data proyek diperbarui, tetapi anggota Staff gagal disimpan: " +
              insertMembersError.message,
          );
        }
      }

      router.push("/dashboard/projects?updated=1");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memperbarui proyek.",
      );
      setSaving(false);
    }
  }

  // REGENERATE PUBLIC TOKEN
  async function handleRegenerateToken() {
    if (regenerating || saving) return;

    const confirmed = window.confirm(
      "Buat ulang token publik?\n\nLink publik lama akan langsung tidak berlaku.",
    );

    if (!confirmed) return;

    setRegenerating(true);
    setError("");

    try {
      const newToken = crypto.randomUUID().replaceAll("-", "");

      const { data, error: updateError } = await supabase
        .from("projects")
        .update({
          public_token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select("id")
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);

      if (!data) {
        throw new Error(
          "Token tidak dapat diperbarui. Periksa izin akses proyek.",
        );
      }

      setPublicToken(newToken);

      try {
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
      } catch (logError) {
        console.error("Gagal mencatat aktivitas pembuatan token:", logError);
      }

      window.alert("Token publik berhasil dibuat ulang.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat ulang token publik.",
      );
    } finally {
      setRegenerating(false);
    }
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
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
        <BackLink />
        <div className={formClass}>
          <p className="text-sm text-[#777777]">Memuat data proyek...</p>
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
          className="mb-6 max-w-4xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass}>
        {/* KLIEN */}
        <div className={fieldClass}>
          <label htmlFor="client" className={TEXT.label}>
            Klien <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            disabled={saving}
          >
            <option value="" disabled>
              Pilih klien
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* NAMA PROYEK */}
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
            disabled={saving}
          />
        </div>

        {/* JENIS PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="projectType" className={TEXT.label}>
            Jenis Proyek
          </label>
          <CustomSelect
            id="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            disabled={saving}
          >
            <option value="" disabled hidden>
              Pilih jenis proyek
            </option>
            <option value="Website">Website</option>
            <option value="Landing Page">Landing Page</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="Company Profile">Company Profile</option>
            <option value="Web Application">Aplikasi Web</option>
          </CustomSelect>
        </div>

        {/* DESKRIPSI */}
        <div className={fieldClass}>
          <label htmlFor="description" className={TEXT.label}>
            Deskripsi Proyek
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Masukkan detail proyek yang akan dikerjakan"
            className={TEXT.textarea}
            disabled={saving}
          />
        </div>

        {/* PROJECT MANAGER */}
        {userRole === "Admin" && (
          <div className={fieldClass}>
            <label htmlFor="picId" className={TEXT.label}>
              Project Manager <span className="text-red-500">*</span>
            </label>

            <CustomSelect
              id="picId"
              value={picId}
              onChange={(e) => setPicId(e.target.value)}
              required
              disabled={saving}
            >
              <option value="">Pilih Project Manager</option>
              {projectManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </CustomSelect>
          </div>
        )}

        {/* ANGGOTA STAFF */}
        <div className={fieldClass}>
          <label className={TEXT.label}>Anggota Staff</label>
          <div className="rounded-xl border border-[#EEEEEE] bg-white p-4">
            {staffUsers.length === 0 ? (
              <p className="text-sm text-[#999999]">
                Belum ada Staff yang tersedia.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {staffUsers.map((staff) => {
                  const checked = selectedStaffIds.includes(staff.id);

                  return (
                    <label
                      key={staff.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-[#1f1e30]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={loading || saving}
                        onChange={(e) => {
                          setSelectedStaffIds((current) =>
                            e.target.checked
                              ? [...current, staff.id]
                              : current.filter((id) => id !== staff.id),
                          );
                        }}
                        className="h-4 w-4 accent-[#B7FE1A]"
                      />
                      {staff.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs leading-5 text-[#999999]">
            Pilih satu atau lebih Staff yang menjadi anggota proyek. Staff
            pertama yang dipilih menjadi PIC Staff utama.
          </p>
        </div>

        {/* TANGGAL */}
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
              disabled={saving}
              className={`${TEXT.input} !pr-4 cursor-pointer [color-scheme:light]`}
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
              disabled={saving}
              className={`${TEXT.input} !pr-4 cursor-pointer [color-scheme:light]`}
            />
          </div>
        </div>

        {/* STATUS */}
        <div className={fieldClass}>
          <label htmlFor="status" className={TEXT.label}>
            Status Proyek <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            id="status"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
            disabled={saving}
          >
            <option value="" disabled hidden>
              Pilih status proyek
            </option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </CustomSelect>
        </div>

        {/* TAUTAN PEMANTAUAN KLIEN */}
        <section className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
          <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold text-[#1f1e30]">
              Tautan Pemantauan Klien
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Kelola akses klien untuk memantau informasi proyek melalui tautan
              publik tanpa perlu login.
            </p>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="publicVisibility"
                type="checkbox"
                checked={publicVisibility}
                onChange={(e) => setPublicVisibility(e.target.checked)}
                disabled={saving}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B7FE1A]"
              />
              <div>
                <p className="text-sm font-medium text-[#1f1e30]">
                  Aktifkan Halaman Publik
                </p>
                <p className="mt-1 text-sm leading-5 text-[#777777]">
                  Klien dapat melihat informasi proyek melalui tautan unik
                  selama akses publik diaktifkan.
                </p>
              </div>
            </label>

            <div className="h-px bg-[#EEEEEE]" />

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
                      className={`${TEXT.input} min-w-0 flex-1 text-[#777777]`}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex h-[54px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#B7FE1A] px-5 text-sm font-medium text-[#1f1e30] transition-colors hover:bg-[#a8ed12]"
                    >
                      Salin Tautan
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    disabled={!publicVisibility}
                    className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#1f1e30] px-4 text-sm font-normal text-white transition-colors hover:bg-[#333247] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buka Halaman Publik
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={regenerating || saving}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-500 bg-red-50 px-3 py-1.5 text-sm font-normal text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {regenerating ? "Membuat Ulang..." : "Buat Ulang Token"}
                  </button>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fce2d3] text-[#1f1e30]">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                      <path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1f1e30]">
                      Keamanan Tautan
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#777777]">
                      Membuat ulang token akan langsung menonaktifkan tautan
                      publik lama. Bagikan tautan baru kepada klien setelah
                      proses selesai.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
                <p className="text-sm leading-6 text-[#777777]">
                  Proyek ini belum memiliki token publik. Buat token untuk
                  menghasilkan tautan pemantauan klien.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={regenerating || saving}
                  className={`${TEXT.primaryButton} mt-4`}
                >
                  {regenerating ? "Membuat Tautan..." : "Buat Tautan Publik"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            disabled={
              saving ||
              clients.length === 0 ||
              statuses.length === 0 ||
              (userRole === "Admin" && !picId)
            }
            className={TEXT.primaryButton}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </main>
  );
}
