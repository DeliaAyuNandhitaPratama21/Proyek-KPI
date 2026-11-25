"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ClientActions from "./ClientActions";

type Client = {
  id: number | string;
  company_name: string | null;
  contact_person: string | null;
  whatsapp: string | null;
  email: string | null;
};

type ClientsClientProps = {
  clients: Client[];
  canDelete: boolean;
  search: string;
};

const TEXT = {
  primary: "text-sm font-medium text-[#1f1e30]",
  secondary: "text-sm text-[#555563]",

  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B7FE1A] px-4 text-sm font-[500] text-[#1f1e30] transition-colors hover:bg-[#a8ed12] sm:w-[130px]",

  secondaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1f1e30] px-4 text-sm font-[500] text-white transition-colors hover:bg-[#333247] sm:w-[130px]",
};

export default function ClientsClient({
  clients,
  canDelete,
  search,
}: ClientsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(search);
  const [success, setSuccess] = useState("");
  const [awaitingRemovedClientId, setAwaitingRemovedClientId] = useState<string | null>(null);
  const [pendingSuccessMessage, setPendingSuccessMessage] = useState("");
  const [hiddenClientIds, setHiddenClientIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  // Sembunyikan klien langsung setelah penghapusan berhasil.
  const visibleClients = clients.filter(
    (client) => !hiddenClientIds.includes(String(client.id))
  );

  // Notifikasi otomatis hilang setelah 3 detik.
  useEffect(() => {
    if (!success) return;

    const timeout = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [success]);

  // Scroll ke atas terlebih dahulu agar notifikasi tambah/edit terlihat.
  // Parameter URL dihapus setelah notifikasi ditampilkan agar tidak muncul lagi saat refresh.
  useEffect(() => {
    const created = searchParams.get("created") === "1";
    const updated = searchParams.get("updated") === "1";

    if (!created && !updated) return;

    let completed = false;
    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (completed) return;
      completed = true;

      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);

      setSuccess(
        created ? "Klien berhasil ditambahkan." : "Klien berhasil diperbarui.",
      );

      const params = new URLSearchParams(searchParams.toString());
      params.delete("created");
      params.delete("updated");

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    };

    if (window.scrollY <= 0) {
      showNotification();
    } else {
      window.addEventListener("scrollend", showNotification, { once: true });
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Fallback untuk browser yang belum mendukung event scrollend.
      fallbackTimeout = setTimeout(showNotification, 3000);
    }

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [searchParams, pathname, router]);

  // Tunggu sampai data terbaru dari server tidak lagi memuat klien yang dihapus.
  useEffect(() => {
    if (!awaitingRemovedClientId) return;

    const clientStillExists = clients.some(
      (client) => String(client.id) === awaitingRemovedClientId
    );

    if (clientStillExists) return;

    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const showNotification = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
      setSuccess(pendingSuccessMessage || "Klien berhasil dihapus.");
      setAwaitingRemovedClientId(null);
      setPendingSuccessMessage("");
    };

    // Jika sudah di posisi paling atas, tampilkan notifikasi langsung.
    if (window.scrollY <= 0) {
      showNotification();
      return;
    }

    // Tunggu sampai animasi scroll benar-benar selesai sebelum menampilkan notifikasi.
    window.addEventListener("scrollend", showNotification, { once: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fallback untuk browser yang belum mendukung event scrollend.
    fallbackTimeout = setTimeout(showNotification, 3000);

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      window.removeEventListener("scrollend", showNotification);
    };
  }, [clients, awaitingRemovedClientId, pendingSuccessMessage]);

  // Sinkronkan input ketika parameter URL berubah.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Server-side search otomatis dengan debounce 500 ms.
  useEffect(() => {
    const keyword = searchInput.trim();

    if (keyword === search) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();

      if (keyword) {
        params.set("search", keyword);
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      router.replace(url, { scroll: false });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput, search, pathname, router]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-5 py-6 text-[#1f1e30] sm:px-7 lg:px-8">
      {/* NOTIFIKASI BERHASIL */}
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#D9EAB5] bg-[#F1FFCC] px-4 py-3 text-sm font-medium text-[#1f1e30]"
        >
          <span>{success}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* SEARCH */}
        <div className="group flex w-full items-center gap-2 rounded-xl border border-[#EEEEEE] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(31,30,48,0.04)] transition-colors focus-within:border-[#1f1e30] md:max-w-sm">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-[#777777] transition-colors group-focus-within:text-[#1f1e30]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari klien..."
            className="w-full min-w-0 bg-transparent text-sm text-[#1f1e30] outline-none placeholder:text-[#999999] [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Hapus pencarian"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-[#777777] transition-colors hover:text-[#1f1e30]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 6-12 12" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* TOMBOL AKSI */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {canDelete && (
            <Link
              href="/dashboard/clients/archive"
              className={TEXT.secondaryButton}
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
              <rect x="3" y="4" width="18" height="4" rx="1" />
              <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
              <path d="M10 12h4" />
            </svg>
              Arsip
            </Link>
          )}

          {canDelete && (
            <Link href="/dashboard/clients/new" className={TEXT.primaryButton}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
              Tambah
            </Link>
          )}
        </div>
      </div>

      {/* DAFTAR KLIEN */}
      <section className="max-w-full overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(31,30,48,0.04)]">
        <div className="border-b border-[#EEEEEE] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-[#1f1e30]">Daftar Klien</h2>

          <p className="mt-1 text-sm text-[#777777]">
            {visibleClients.length} klien terdaftar
          </p>
        </div>

        {visibleClients.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#D6D3D1] scrollbar-track-transparent hover:scrollbar-thumb-[#A8A8A8]">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#EEEEEE] bg-[#fafaf9] text-left text-xs font-semibold uppercase tracking-wide text-[#777777]">
                  <th className="whitespace-nowrap px-6 py-4">
                    Nama Perusahaan
                  </th>
                  <th className="whitespace-nowrap px-6 py-4">Nama Kontak</th>
                  <th className="whitespace-nowrap px-6 py-4">
                    Nomor WhatsApp
                  </th>
                  <th className="px-6 py-4">Alamat Email</th>
                  <th className="px-6 py-4 text-center">Tindakan</th>
                </tr>
              </thead>

              <tbody>
                {visibleClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[#EEEEEE] last:border-b-0"
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
                      <ClientActions
                        clientId={Number(client.id)}
                        companyName={client.company_name || "Klien"}
                        canDelete={canDelete}
                        onDeleted={() => {
                          // Hilangkan baris klien terlebih dahulu.
                          setHiddenClientIds((current) => [
                            ...current,
                            String(client.id),
                          ]);
                          setPendingSuccessMessage("Klien berhasil dihapus.");
                          setAwaitingRemovedClientId(String(client.id));
                          startTransition(() => {
                            router.refresh();
                          });
                        }}
                        onArchived={() => {
                          // Hilangkan baris klien terlebih dahulu setelah arsip berhasil.
                          setHiddenClientIds((current) => [
                            ...current,
                            String(client.id),
                          ]);
                          setPendingSuccessMessage("Klien berhasil diarsipkan.");
                          setAwaitingRemovedClientId(String(client.id));
                          startTransition(() => {
                            router.refresh();
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-13 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1FFCC]">
              <ClientIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#1f1e30]">
              {search ? "Klien Tidak Ditemukan" : "Belum Ada Klien"}
            </h3>

            <p className="mt-1 text-sm text-[#777777]">
              {search
                ? "Tidak ada klien yang sesuai dengan pencarian."
                : "Belum ada klien yang terdaftar untuk ditampilkan."}
            </p>

            {!search && canDelete && (
              <Link
                href="/dashboard/clients/new"
                className="mt-5 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium text-[#65A30D] transition-colors hover:text-[#4D7C0F]"
              >
                Tambah Klien Pertama
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function ClientIcon() {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: "22px",
        color: "#1f1e30",
        fontWeight: 400,
        fontStyle: "normal",
        lineHeight: 1,
        letterSpacing: "normal",
        textTransform: "none",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        direction: "ltr",
        fontFeatureSettings: '"liga"',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      business
    </span>
  );
}
