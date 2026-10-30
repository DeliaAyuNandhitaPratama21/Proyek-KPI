import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import ClientActions from "./ClientActions";
import { requireRole } from "../../auth/role-guard";

const TEXT = {
  pageTitle: "text-3xl font-semibold tracking-tight text-white",
  sectionTitle: "text-lg font-semibold text-white",
  subtitle: "mt-1 text-sm text-zinc-400",
  primary: "text-sm font-medium text-white",
  secondary: "text-sm text-[#A5BDCC]",
  primaryButton:
    "inline-flex w-fit items-center gap-2 rounded-xl bg-[#B7FE1A] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#caff57]",
};

export default async function ClientsPage() {
  const profile = await requireRole(["Admin", "Project Manager"]);

  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="mb-8 mt-2">
          <h1 className={TEXT.pageTitle}>Data Klien</h1>
          <p className={TEXT.subtitle}>
            Kelola informasi klien dan data kontak
          </p>
        </div>

        <div className="max-w-4xl rounded-[22px] border border-red-500/20 bg-[#1c1c1c]/80 p-5 text-sm text-red-400">
          Data klien gagal dimuat. Silakan muat ulang halaman.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 py-6 text-white sm:px-7 lg:px-8">
      <div className="mb-8 mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={TEXT.pageTitle}>Data Klien</h1>
          <p className={TEXT.subtitle}>
            Kelola informasi klien dan data kontak
          </p>
        </div>

        <Link
          href="/dashboard/clients/new"
          className={`${TEXT.primaryButton} w-full sm:w-auto`}
        >
          Tambah Klien
        </Link>
      </div>

      <section className="max-w-full overflow-hidden rounded-[22px] border border-[#2a2a2a] bg-[#1c1c1c]/80">
        <div className="border-b border-[#262626] px-6 py-5 sm:px-8">
          <h2 className={TEXT.sectionTitle}>Daftar Klien</h2>
          <p className={TEXT.subtitle}>
            {clients?.length ?? 0} klien terdaftar
          </p>
        </div>

        {clients && clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-4">Nama Perusahaan</th>
                  <th className="px-6 py-4">Nama Kontak</th>
                  <th className="px-6 py-4">Nomor WhatsApp</th>
                  <th className="px-6 py-4">Alamat Email</th>
                  <th className="px-6 py-4">Status Klien</th>
                  <th className="px-6 py-4">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[#262626] transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className={`px-6 py-4 ${TEXT.primary}`}>
                      {client.company_name || "-"}
                    </td>

                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {client.contact_person || "-"}
                    </td>

                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {client.whatsapp || "-"}
                    </td>

                    <td className={`px-6 py-4 ${TEXT.secondary}`}>
                      {client.email || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>

                    <td className="px-6 py-4">
                      <ClientActions
                        clientId={Number(client.id)}
                        companyName={client.company_name || "Klien"}
                        canDelete={profile.role === "Admin"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#262626]">
              <ClientIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Belum Ada Klien
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Tambahkan data klien untuk mulai mengelola proyek.
            </p>

            <Link
              href="/dashboard/clients/new"
              className={`${TEXT.primaryButton} mt-5`}
            >
              Tambah Klien Pertama
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const isActive = status === "Active";

  const label =
    status === "Active"
      ? "Aktif"
      : status === "Archived"
        ? "Diarsipkan"
        : status === "Inactive"
          ? "Tidak Aktif"
          : status || "-";

  return (
    <span
      className={`inline-flex min-w-[112px] items-center justify-start gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        isActive ? "bg-[#075C3C] text-[#6EE7B7]" : "bg-[#262626] text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isActive ? "bg-[#6EE7B7]" : "bg-zinc-500"
        }`}
      />
      {label}
    </span>
  );
}

function ClientIcon() {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: "22px",
        color: "#B7FE1A",
        fontWeight: 400,
        lineHeight: 1,
        fontFeatureSettings: '"liga"',
      }}
    >
      group
    </span>
  );
}