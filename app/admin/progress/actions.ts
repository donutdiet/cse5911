"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getSemesterRolloverSteps,
  type SemesterRolloverSelection,
  validateSemesterRolloverRequest,
} from "@/lib/semester-rollover";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type SemesterRolloverSummary = {
  deletedStudentUsers: number;
  deletedProfiles: number;
  deletedAvailabilityRows: number;
  deletedMembershipRows: number;
  deletedGroups: number;
  deletedAgendaRows: number;
  deletedSectionRows: number;
  deletedTaskRows: number;
  deletedTaskCompletionRows: number;
  deletedRoomRows: number;
  deletedRoomDayRows: number;
  clearedGroupRoomAssignments: number;
};

export type SemesterRolloverResult =
  | {
      success: true;
      summary: SemesterRolloverSummary;
      completedSteps: string[];
    }
  | {
      error: string;
      summary: SemesterRolloverSummary;
      completedSteps: string[];
    };

const EMPTY_SUMMARY: SemesterRolloverSummary = {
  deletedStudentUsers: 0,
  deletedProfiles: 0,
  deletedAvailabilityRows: 0,
  deletedMembershipRows: 0,
  deletedGroups: 0,
  deletedAgendaRows: 0,
  deletedSectionRows: 0,
  deletedTaskRows: 0,
  deletedTaskCompletionRows: 0,
  deletedRoomRows: 0,
  deletedRoomDayRows: 0,
  clearedGroupRoomAssignments: 0,
};

async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not logged in" } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    console.error("Error loading caller profile:", profileError);
    return { error: "Failed to verify admin access" } as const;
  }

  if (profile?.role !== "admin") {
    return { error: "Admin only" } as const;
  }

  return { userId: user.id } as const;
}

export async function runSemesterRollover(args: {
  selection: SemesterRolloverSelection;
  confirmationText: string;
}): Promise<SemesterRolloverResult> {
  const validationError = validateSemesterRolloverRequest(args);
  if (validationError) {
    return {
      error: validationError,
      summary: { ...EMPTY_SUMMARY },
      completedSteps: [],
    };
  }

  const supabase = await createClient();
  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return {
      error: adminCheck.error,
      summary: { ...EMPTY_SUMMARY },
      completedSteps: [],
    };
  }

  const adminClient = await createAdminClient();
  const summary = { ...EMPTY_SUMMARY };
  const completedSteps: string[] = [];

  try {
    for (const step of getSemesterRolloverSteps(args.selection)) {
      if (step === "usersAndProfiles") {
        await clearUsersAndProfiles(supabase, adminClient, summary);
        completedSteps.push("users + profiles");
      } else if (step === "agendas") {
        await clearAgendas(supabase, summary);
        completedSteps.push("agendas");
      } else if (step === "rooms") {
        await clearRooms(supabase, summary);
        completedSteps.push("rooms");
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `${error.message}${
              completedSteps.length > 0
                ? ` Completed before failure: ${completedSteps.join(", ")}.`
                : ""
            }`
          : "Semester rollover failed.",
      summary,
      completedSteps,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/roster");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/agendas");
  revalidatePath("/admin/progress");
  revalidatePath("/student");
  revalidatePath("/student/agenda");
  revalidatePath("/student/availability");
  revalidatePath("/student/group");
  revalidatePath("/student/profile");

  return {
    success: true,
    summary,
    completedSteps,
  };
}

async function clearUsersAndProfiles(
  supabase: SupabaseClient,
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  summary: SemesterRolloverSummary,
) {
  const { data: studentProfiles, error: studentProfilesError } = await supabase
    .from("profile")
    .select("user_id")
    .eq("role", "student");

  if (studentProfilesError) {
    console.error("Failed to load students for rollover:", studentProfilesError);
    throw new Error("Failed to load student accounts for rollover.");
  }

  const studentIds = (studentProfiles ?? []).map((profile) => profile.user_id);
  if (studentIds.length === 0) {
    const orphanedGroupCount = await deleteAllGroups(supabase);
    summary.deletedGroups += orphanedGroupCount;
    return;
  }

  const deletedTaskCompletions = await deleteWhereIn(
    supabase,
    "task_completion",
    "user_id",
    studentIds,
    "Failed to clear task completion records.",
  );
  summary.deletedTaskCompletionRows += deletedTaskCompletions;

  const deletedAvailability = await deleteWhereIn(
    supabase,
    "availability",
    "user_id",
    studentIds,
    "Failed to clear student availability.",
  );
  summary.deletedAvailabilityRows += deletedAvailability;

  const deletedMemberships = await deleteWhereIn(
    supabase,
    "member_of",
    "user_id",
    studentIds,
    "Failed to clear group memberships.",
  );
  summary.deletedMembershipRows += deletedMemberships;

  const deletedGroups = await deleteAllGroups(supabase);
  summary.deletedGroups += deletedGroups;

  const deletedProfiles = await deleteWhereIn(
    supabase,
    "profile",
    "user_id",
    studentIds,
    "Failed to clear student profiles.",
  );
  summary.deletedProfiles += deletedProfiles;

  for (const studentId of studentIds) {
    const { error } = await adminClient.auth.admin.deleteUser(studentId);
    if (error) {
      console.error("Failed to delete auth user during rollover:", error);
      throw new Error(
        `Failed to delete auth user ${studentId}: ${error.message}`,
      );
    }

    summary.deletedStudentUsers += 1;
  }
}

async function clearAgendas(
  supabase: SupabaseClient,
  summary: SemesterRolloverSummary,
) {
  const { data: sectionRows, error: sectionRowsError } = await supabase
    .from("section")
    .select("id");

  if (sectionRowsError) {
    console.error("Failed to load sections for rollover:", sectionRowsError);
    throw new Error("Failed to load agenda sections for rollover.");
  }

  const sectionIds = (sectionRows ?? []).map((row) => row.id);

  const { data: taskRows, error: taskRowsError } = sectionIds.length
    ? await supabase.from("task").select("id").in("section_id", sectionIds)
    : { data: [] as { id: number }[], error: null };

  if (taskRowsError) {
    console.error("Failed to load tasks for rollover:", taskRowsError);
    throw new Error("Failed to load agenda tasks for rollover.");
  }

  const taskIds = (taskRows ?? []).map((row) => row.id);

  if (taskIds.length > 0) {
    const deletedTaskCompletions = await deleteWhereIn(
      supabase,
      "task_completion",
      "task_id",
      taskIds,
      "Failed to clear task completion rows tied to agendas.",
    );
    summary.deletedTaskCompletionRows += deletedTaskCompletions;
  }

  if (taskIds.length > 0) {
    const deletedTasks = await deleteWhereIn(
      supabase,
      "task",
      "id",
      taskIds,
      "Failed to clear tasks.",
    );
    summary.deletedTaskRows += deletedTasks;
  }

  if (sectionIds.length > 0) {
    const deletedSections = await deleteWhereIn(
      supabase,
      "section",
      "id",
      sectionIds,
      "Failed to clear agenda sections.",
    );
    summary.deletedSectionRows += deletedSections;
  }

  const { data: agendaRows, error: agendaRowsError } = await supabase
    .from("agenda")
    .select("id");

  if (agendaRowsError) {
    console.error("Failed to load agendas for rollover:", agendaRowsError);
    throw new Error("Failed to load agendas for rollover.");
  }

  const agendaIds = (agendaRows ?? []).map((row) => row.id);
  if (agendaIds.length > 0) {
    const deletedAgendas = await deleteWhereIn(
      supabase,
      "agenda",
      "id",
      agendaIds,
      "Failed to clear agendas.",
    );
    summary.deletedAgendaRows += deletedAgendas;
  }
}

async function clearRooms(
  supabase: SupabaseClient,
  summary: SemesterRolloverSummary,
) {
  const { data: roomsData, error: roomsError } = await supabase
    .from("room")
    .select("id");

  if (roomsError) {
    console.error("Failed to load rooms for rollover:", roomsError);
    throw new Error("Failed to load rooms for rollover.");
  }

  const roomIds = (roomsData ?? []).map((room) => room.id);
  if (roomIds.length === 0) {
    return;
  }

  const { data: groupsWithRooms, error: groupsError } = await supabase
    .from("group")
    .select("id")
    .not("room_id", "is", null);

  if (groupsError) {
    console.error("Failed to load group room assignments:", groupsError);
    throw new Error("Failed to inspect current room assignments.");
  }

  const assignedGroupIds = (groupsWithRooms ?? []).map((group) => group.id);
  if (assignedGroupIds.length > 0) {
    const { error: clearAssignmentsError } = await supabase
      .from("group")
      .update({ room_id: null, room_overbooked: false })
      .in("id", assignedGroupIds);

    if (clearAssignmentsError) {
      console.error(
        "Failed to clear group room assignments:",
        clearAssignmentsError,
      );
      throw new Error("Failed to clear room assignments from groups.");
    }

    summary.clearedGroupRoomAssignments += assignedGroupIds.length;
  }

  const deletedRoomDays = await deleteWhereIn(
    supabase,
    "room_day",
    "room_id",
    roomIds,
    "Failed to clear room day availability.",
  );
  summary.deletedRoomDayRows += deletedRoomDays;

  const deletedRooms = await deleteWhereIn(
    supabase,
    "room",
    "id",
    roomIds,
    "Failed to clear rooms.",
  );
  summary.deletedRoomRows += deletedRooms;
}

async function deleteAllGroups(supabase: SupabaseClient) {
  const { data: groupsData, error: groupsError } = await supabase
    .from("group")
    .select("id");

  if (groupsError) {
    console.error("Failed to load groups for rollover:", groupsError);
    throw new Error("Failed to load groups for rollover.");
  }

  const groupIds = (groupsData ?? []).map((group) => group.id);
  if (groupIds.length === 0) {
    return 0;
  }

  const { error: deleteGroupsError } = await supabase
    .from("group")
    .delete()
    .in("id", groupIds);

  if (deleteGroupsError) {
    console.error("Failed to delete groups for rollover:", deleteGroupsError);
    throw new Error("Failed to clear groups.");
  }

  return groupIds.length;
}

async function deleteWhereIn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  values: Array<string | number>,
  errorMessage: string,
) {
  if (values.length === 0) {
    return 0;
  }

  const { data: rowsToDelete, error: loadError } = await supabase
    .from(table)
    .select(column)
    .in(column, values);

  if (loadError) {
    console.error(`Failed to inspect rows in ${table}:`, loadError);
    throw new Error(errorMessage);
  }

  const { error } = await supabase.from(table).delete().in(column, values);

  if (error) {
    console.error(`Failed to delete from ${table}:`, error);
    throw new Error(errorMessage);
  }

  return rowsToDelete?.length ?? 0;
}
