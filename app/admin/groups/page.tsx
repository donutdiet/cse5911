/*
  app/admin/groups/page.tsx

  Server component. Handles auth, fetches groups, and passes everything
  down to AdminGroupsClient which handles the two views and button logic.
  Keeping this thin means the client component can call router.refresh()
  after generating groups and this page will re-run and pass fresh data.
*/

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminGroupsClient from "@/components/admin/admin-groups-client";
import { createClient } from "@/lib/supabase/server";

type UngroupedStudent = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  profile_picture_url: string | null;
};

export default async function AdminGroupsPage() {
  const supabase = await createClient();

  // fetch all groups with their members and member profiles
  const { data: groups } = await supabase
    .from("group")
    .select(
      `
      id,
      preference,
      day_of_week,
      meet_start_time,
      meet_end_time,
      created_at,
      member_of (
        user_id,
        profile (
          full_name,
          email
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  const { data: studentProfiles, error: studentProfilesError } = await supabase
    .from("profile")
    .select(
      `
      user_id,
      full_name,
      email,
      phone,
      preference,
      profile_picture_url,
      member_of (
        group_id
      )
    `,
    )
    .eq("role", "student");

  if (studentProfilesError) {
    console.error(
      "Failed to fetch ungrouped students:",
      studentProfilesError.message,
    );
  }

  const ungroupedStudents: UngroupedStudent[] = (studentProfiles ?? [])
    .filter((student) => !student.member_of || student.member_of.length === 0)
    .map((student) => ({
      user_id: student.user_id,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      preference: student.preference,
      profile_picture_url: student.profile_picture_url,
    }));

  return (
    <div className="w-full max-w-7xl space-y-2">
      <AdminGroupsClient
        groups={groups ?? []}
        ungroupedStudents={ungroupedStudents}
      />
    </div>
  );
}
