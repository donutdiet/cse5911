import { createClient } from "@/lib/supabase/server";
import { RosterTable } from "@/components/admin/roster-table";

export default async function RosterPage() {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profile")
    .select("user_id, full_name, role, email")
    .eq("role", "student");

  if (profilesError) {
    console.error("Failed to fetch roster:", profilesError.message);
  }

  const roster = profiles ?? [];

  return (
    <div className="w-full max-w-6xl space-y-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Student Roster</h1>
        <p className="text-muted-foreground text-sm">
          {roster.length} {roster.length === 1 ? "student" : "students"}{" "}
          enrolled
        </p>
      </div>
      <RosterTable students={roster} />
    </div>
  );
}
