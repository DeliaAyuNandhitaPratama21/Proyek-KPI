
"use client";

import { FormEvent, useEffect, useState, SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";

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
  id: number;
  name: string;
  sort_order: number;
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

const dateInputClass = `${TEXT.input} !pr-4 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0`;

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

export default function NewProjectPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [clients, setClients] = useState<Client[]>([]);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [description, setDescription] = useState("");
  const [picId, setPicId] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [statusId, setStatusId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw new Error(authError.message);

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);

        const role = String(profile?.role || "").trim();

        if (!["Admin", "Project Manager"].includes(role)) {
          router.replace("/dashboard");
          return;
        }

        const [clientsResult, managersResult, staffResult, statusesResult] =
          await Promise.all([
            supabase
              .from("clients")
              .select("id, company_name")
              .eq("status", "Active")
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
              .select("id, name, sort_order")
              .order("sort_order"),
          ]);

        if (cancelled) return;

        if (clientsResult.error) throw new Error(clientsResult.error.message);
        if (managersResult.error) throw new Error(managersResult.error.message);
        if (staffResult.error) throw new Error(staffResult.error.message);
        if (statusesResult.error) throw new Error(statusesResult.error.message);

        const loadedStatuses = (statusesResult.data || []) as ProjectStatus[];

        setCurrentUserId(user.id);
        setCurrentUserName(profile?.name || "");
        setUserRole(role);

        setClients(clientsResult.data || []);
        setProjectManagers(managersResult.data || []);
        setStaffUsers(staffResult.data || []);
        setStatuses(loadedStatuses);

        // Jika pembuat adalah PM, otomatis dirinya menjadi PM proyek.
        if (role === "Project Manager") {
          setPicId(user.id);
        }
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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // PM otomatis menjadi penanggung jawab proyeknya sendiri.
      const finalPicId = userRole === "Project Manager" ? user.id : picId;

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

      const publicToken = crypto.randomUUID().replaceAll("-", "");

      const { data: newProject, error: insertError } = await supabase
        .from("projects")
        .insert({
          client_id: clientId,
          project_name: projectName.trim(),
          project_type: projectType || null,
          description: description.trim() || null,

          // PM penanggung jawab proyek
          pic_id: finalPicId,

          // Staff pertama yang dipilih menjadi PIC Staff utama.
          pic: selectedStaffIds[0] || null,

          created_by: user.id,
          start_date: startDate || null,
          deadline: deadline || null,
          status_id: Number(statusId),
          progress: 0,
          public_token: publicToken,
          public_visibility: true,
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      // Simpan seluruh Staff terpilih sebagai anggota proyek.
      if (selectedStaffIds.length > 0) {
        const members = selectedStaffIds.map((staffId) => ({
          project_id: newProject.id,
          user_id: staffId,
        }));

        const { error: membersError } = await supabase
          .from("project_members")
          .insert(members);

        if (membersError) {
          throw new Error(
            "Proyek berhasil dibuat, tetapi anggota Staff gagal disimpan: " +
              membersError.message,
          );
        }
      }

      router.push("/dashboard/projects?created=1");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan proyek.",
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
            disabled={loading || saving || clients.length === 0}
          >
            <option value="" disabled hidden>
              Pilih klien
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </CustomSelect>

          {clients.length === 0 && (
            <p className="text-xs leading-5 text-[#999999]">
              Belum ada klien aktif. Tambahkan atau aktifkan data klien terlebih
              dahulu.
            </p>
          )}
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

        {/* PROJECT MANAGER - hanya ditampilkan untuk Admin */}
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
              disabled={loading || saving}
            >
              <option value="" disabled>
                Pilih Project Manager
              </option>
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
            Pilih satu atau lebih Staff yang akan menjadi anggota proyek.
            Staff pertama yang dipilih menjadi PIC Staff utama.
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
              onClick={(e) => {
                if (!saving && "showPicker" in e.currentTarget) {
                  try {
                    e.currentTarget.showPicker();
                  } catch {
                    // Browser akan menggunakan date picker bawaannya.
                  }
                }
              }}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (deadline && e.target.value && deadline < e.target.value) {
                  setDeadline("");
                }
              }}
              disabled={saving}
              className={dateInputClass}
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
              min={startDate || undefined}
              onClick={(e) => {
                if (!saving && "showPicker" in e.currentTarget) {
                  try {
                    e.currentTarget.showPicker();
                  } catch {
                    // Browser akan menggunakan date picker bawaannya.
                  }
                }
              }}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
              className={dateInputClass}
            />
          </div>
        </div>

        {/* STATUS PROYEK */}
        <div className={fieldClass}>
          <label htmlFor="status" className={TEXT.label}>
            Status Proyek <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            id="status"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
            disabled={loading || saving || statuses.length === 0}
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
        <div className="flex items-start gap-3 rounded-xl border border-[#EEEEEE] bg-[#f7f7f5] p-4">
          <div className="flex flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1ffcc] text-[#1f1e30]">
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
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1f1e30]">
              Tautan Pemantauan Klien
            </p>
            <p className="mt-1 text-sm leading-6 text-[#777777]">
              Tautan publik dibuat otomatis agar klien dapat memantau proyek.
              Visibilitas informasi dapat diatur setelah proyek dibuat.
            </p>
          </div>
        </div>

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
              loading ||
              saving ||
              clients.length === 0 ||
              statuses.length === 0 ||
              !statusId ||
              (userRole === "Admin" && !picId)
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
