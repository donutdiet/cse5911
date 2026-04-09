"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { runMatchingAlgorithm } from "@/lib/matching";

type StudentProfileRow = {
  user_id: string;
  full_name: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  member_of?: {
    group_id: string;
  }[] | null;
};

type AvailabilityRow = {
  user_id: string;
  time_slot_id: number;
  time_slot:
    | {
        slot_index: number;
      }
    | {
        slot_index: number;
      }[]
    | null;
};

type MatchingStudent = {
  user_id: string;
  full_name: string;
  preference: "in_person" | "online" | "no_preference";
  availability: {
    time_slot_id: number;
    slot_index: number;
  }[];
};

type MatchingMode = "regroup_all" | "group_ungrouped";

export async function removeStudent(studentId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Not logged in");
  }

  const { data: callerProfile, error: callerProfileError } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (callerProfileError || callerProfile?.role !== "admin") {
    throw new Error("Admin only");
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", studentId);

  if (targetProfileError) {
    console.error(
      "Failed to load student profile:",
      targetProfileError.message,
    );
    throw new Error(targetProfileError.message);
  }

  const studentProfile = targetProfile?.[0];

  if (!studentProfile) {
    throw new Error("Student profile not found.");
  }

  const { error } = await (await adminClient).auth.admin.deleteUser(studentId);

  if (error) {
    console.error("Failed to remove student:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/admin/roster");
}

/*
  Converts a slot_index back to a time string like "10:00:00".
  slot_index = (day * 16) + position, position 0 = 7am, each slot is 1 hour.
*/
function slotIndexToTime(slotIndex: number, day: number) {
  const position = slotIndex - day * 16;
  const hourOfDay = 7 + position;
  return `${String(hourOfDay).padStart(2, "0")}:00:00`;
}

export async function runMatchingAction(
  mode: MatchingMode = "group_ungrouped",
) {
  const supabase = await createClient();

  // confirm the caller is an admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not logged in" };
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Admin only" };
  }

  // fetch all student profiles so we can either regroup everyone or only place
  // students who are not already in a group
  const { data: studentProfiles, error: profileError } = await supabase
    .from("profile")
    .select("user_id, full_name, preference, member_of(group_id)")
    .eq("role", "student");

  if (profileError) {
    console.error("Error fetching profiles:", profileError);
    return { error: "Failed to fetch students" };
  }

  // fetch all availability rows joined with time_slot to get slot_index
  const { data: availabilityRows, error: availError } = await supabase
    .from("availability")
    .select("user_id, time_slot_id, time_slot(slot_index)");

  if (availError) {
    console.error("Error fetching availability:", availError);
    return { error: "Failed to fetch availability" };
  }

  // group availability rows by user_id
  const availabilityByUser: Record<
    string,
    { time_slot_id: number; slot_index: number }[]
  > = {};
  for (const row of (availabilityRows ?? []) as AvailabilityRow[]) {
    const slot = Array.isArray(row.time_slot)
      ? row.time_slot[0]
      : row.time_slot;
    if (!slot) {
      continue;
    }

    if (!availabilityByUser[row.user_id]) {
      availabilityByUser[row.user_id] = [];
    }
    availabilityByUser[row.user_id].push({
      time_slot_id: row.time_slot_id,
      slot_index: slot.slot_index,
    });
  }

  // build the student array the algorithm expects
  const students: MatchingStudent[] = (
    (studentProfiles ?? []) as StudentProfileRow[]
  )
    .filter((profileRow) =>
      mode === "regroup_all"
        ? true
        : !profileRow.member_of || profileRow.member_of.length === 0,
    )
    .map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name ?? "Unknown",
      preference: p.preference ?? "no_preference",
      availability: availabilityByUser[p.user_id] ?? [],
    }));

  const { groups, flagged } = runMatchingAlgorithm(students);

  if (mode === "regroup_all") {
    const { error: memberDeleteError } = await supabase
      .from("member_of")
      .delete()
      .not("group_id", "is", null);

    if (memberDeleteError) {
      console.error("Error clearing group memberships:", memberDeleteError);
      return { error: "Failed to clear existing group memberships" };
    }

    const { error: groupDeleteError } = await supabase
      .from("group")
      .delete()
      .not("id", "is", null);

    if (groupDeleteError) {
      console.error("Error clearing existing groups:", groupDeleteError);
      return { error: "Failed to clear existing groups" };
    }
  }

  let groupsCreated = 0;

  for (const group of groups) {
    const startTime = slotIndexToTime(
      group.window.startIndex,
      group.window.day,
    );
    const endTime = slotIndexToTime(
      group.window.startIndex + 1,
      group.window.day,
    );

    const { data: newGroup, error: groupError } = await supabase
      .from("group")
      .insert({
        preference: group.preference,
        day_of_week: group.window.day,
        meet_start_time: startTime,
        meet_end_time: endTime,
      })
      .select("id")
      .single();

    if (groupError) {
      console.error("Error inserting group:", groupError);
      continue;
    }

    const memberRows = group.members.map((member) => ({
      group_id: newGroup.id,
      user_id: member.user_id,
    }));

    const { error: memberError } = await supabase
      .from("member_of")
      .insert(memberRows);

    if (memberError) {
      console.error(
        "Error inserting members for group",
        newGroup.id,
        memberError,
      );
    }

    groupsCreated++;
  }

  revalidatePath("/admin/groups");

  return {
    groupsCreated,
    flaggedCount: flagged.length,
    flagged: flagged.map((s) => ({
      user_id: s.user_id,
      full_name: s.full_name,
    })),
  };
}
