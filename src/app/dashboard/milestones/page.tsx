import { createClient } from "../../../lib/supabase/server";
import { requireRole } from "../../auth/role-guard";
import MilestonesClient from "./MilestonesClient";

export type MilestoneRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  client_visible: boolean;
  projects: {
    id: string;
    project_name: string;
    pic_id: string | null;
    pic: {
      name: string | null;
      role: string | null;
    } | null;
  } | null;
};

type MilestonesPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

const milestoneSelect = `
  id,
  name,
  description,
  status,
  due_date,
  created_at,
  client_visible,
  projects!inner (
    id,
    project_name,
    pic_id,
    is_archived,
    pic:users!projects_pic_id_fkey (
      name,
      role
    )
  )
`;

export default async function MilestonesPage({
  searchParams,
}: MilestonesPageProps) {
  // HANYA ADMIN, PROJECT MANAGER, DAN STAFF
  const profile = await requireRole(["Admin", "Project Manager", "Staff"]);

  const isStaff = profile.role === "Staff";
  const isAdmin = profile.role === "Admin";
  const supabase = await createClient();

  const params = await searchParams;
  const search = (params.search ?? "").trim();

  // Hilangkan karakter yang dapat mengganggu sintaks filter PostgREST.
  const keyword = search.replace(/[,%()\\]/g, "").trim();

  // Ambil seluruh milestone untuk menjaga perhitungan progres,
  // deadline, jumlah milestone, dan urutan ikon proyek tetap akurat.
  const allMilestonesQuery = supabase
    .from("milestones")
    .select(milestoneSelect)
    .eq("projects.is_archived", false)
    .order("due_date", { ascending: true });

  // Jika ada pencarian, cari ID proyek yang nama proyeknya cocok.
  // Query ini tetap mengikuti RLS Supabase yang berlaku.
  const matchingProjectsQuery = keyword
    ? supabase
        .from("projects")
        .select("id")
        .eq("is_archived", false)
        .ilike("project_name", `%${keyword}%`)
    : null;

  const [allResult, matchingProjectsResult] = await Promise.all([
    allMilestonesQuery,
    matchingProjectsQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  let error = allResult.error ?? matchingProjectsResult.error;
  const allMilestones = (allResult.data ?? []) as unknown as MilestoneRow[];
  let filteredMilestones = allMilestones;

  // Pencarian dilakukan di Supabase, bukan dengan Array.filter() di server.
  // Hasil mencakup milestone yang namanya cocok atau seluruh milestone
  // dari proyek yang nama proyeknya cocok.
  if (keyword && !error) {
    const matchingProjectIds = (matchingProjectsResult.data ?? []).map(
      (project: { id: string | number }) => String(project.id),
    );

    let searchQuery = supabase
      .from("milestones")
      .select(milestoneSelect)
      .eq("projects.is_archived", false);

    if (matchingProjectIds.length > 0) {
      searchQuery = searchQuery.or(
        `name.ilike.%${keyword}%,project_id.in.(${matchingProjectIds.join(",")})`,
      );
    } else {
      searchQuery = searchQuery.ilike("name", `%${keyword}%`);
    }

    const searchResult = await searchQuery.order("due_date", {
      ascending: true,
    });

    if (searchResult.error) {
      error = searchResult.error;
    } else {
      filteredMilestones = (searchResult.data ??
        []) as unknown as MilestoneRow[];
    }
  }

  if (error) {
    console.error("Gagal memuat milestone:", error);
  }

  return (
    <MilestonesClient
      milestones={filteredMilestones}
      allMilestones={allMilestones}
      search={search}
      hasError={Boolean(error)}
      isStaff={isStaff}
      isAdmin={isAdmin}
      currentUserId={profile.id}
    />
  );
}
