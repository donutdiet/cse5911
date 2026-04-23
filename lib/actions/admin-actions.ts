"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { runMatchingAlgorithm } from "@/lib/matching";
import {
  assignRoomsToGroups,
  type ExistingRoomUsage,
  type RoomAssignmentCandidate,
  type RoomInventory,
  type RoomOverflow,
  DEFAULT_ROOM_GROUP_CAPACITY,
} from "@/lib/room-assignment";
import {
  buildCompatibilityWarnings,
  type AssignStudentInput,
  type CompatibilityWarning,
  type GroupPreference,
  type ManualGroupInput,
  validateManualGroupInput,
} from "@/lib/group-management";

type StudentProfileRow = {
  user_id: string;
  full_name: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  study_mode: "group" | "independent";
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

type GroupMembershipRow = {
  group_id: string;
};

type GroupRow = {
  id: string;
  preference: GroupPreference | null;
  day_of_week: number | null;
  meet_start_time: string | null;
  meet_end_time: string | null;
  room_id?: number | null;
};

type ManualStudentContext = {
  user_id: string;
  full_name: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  study_mode: "group" | "independent";
  member_of?: GroupMembershipRow[] | null;
  availabilitySlotIndexes: number[];
};

type ManualActionResult =
  | { error: string }
  | { requiresConfirmation: true; warnings: CompatibilityWarning[] }
  | {
      success: true;
      warnings: CompatibilityWarning[];
      assignedCount?: number;
      groupId?: string;
    };

type MatchingActionResult =
  | { error: string }
  | {
      requiresRoomConfirmation: true;
      groupsPreviewCount: number;
      flaggedCount: number;
      flagged: {
        user_id: string;
        full_name: string;
      }[];
      roomOverflow: RoomOverflow[];
    }
  | {
      groupsCreated: number;
      flaggedCount: number;
      flagged: {
        user_id: string;
        full_name: string;
      }[];
      roomOverflowCount: number;
      roomOverflow: RoomOverflow[];
      roomlessCount: number;
      overbookedCount: number;
    };

type RoomDayRow =
  | {
      day: number;
    }
  | {
      day: number;
    }[]
  | null;

type RoomRow = {
  id: number;
  building: string;
  room_number: string;
  group_capacity: number | null;
  room_day: RoomDayRow;
};

type ExistingScheduledGroupRow = {
  room_id: number | null;
  day_of_week: number | null;
  meet_start_time: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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

async function loadStudentContexts(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<{ students: ManualStudentContext[] } | { error: string }> {
  if (userIds.length === 0) {
    return { students: [] };
  }

  const uniqueIds = [...new Set(userIds)];

  const { data: studentProfiles, error: profileError } = await supabase
    .from("profile")
    .select("user_id, full_name, preference, study_mode, member_of(group_id)")
    .in("user_id", uniqueIds)
    .eq("role", "student");

  if (profileError) {
    console.error("Error fetching student profiles:", profileError);
    return { error: "Failed to load selected students" };
  }

  const { data: availabilityRows, error: availabilityError } = await supabase
    .from("availability")
    .select("user_id, time_slot(slot_index)")
    .in("user_id", uniqueIds);

  if (availabilityError) {
    console.error("Error fetching student availability:", availabilityError);
    return { error: "Failed to load student availability" };
  }

  const slotIndexesByUser = new Map<string, number[]>();

  for (const row of (availabilityRows ?? []) as {
    user_id: string;
    time_slot:
      | { time_slot_id?: number; slot_index: number }
      | { time_slot_id?: number; slot_index: number }[]
      | null;
  }[]) {
    const timeSlot = Array.isArray(row.time_slot) ? row.time_slot[0] : row.time_slot;
    if (!timeSlot) {
      continue;
    }

    const existing = slotIndexesByUser.get(row.user_id) ?? [];
    existing.push(timeSlot.slot_index);
    slotIndexesByUser.set(row.user_id, existing);
  }

  const students = ((studentProfiles ?? []) as StudentProfileRow[]).map((student) => ({
    ...student,
    availabilitySlotIndexes: slotIndexesByUser.get(student.user_id) ?? [],
  }));

  return { students };
}

function buildWarningsForStudents(
  students: ManualStudentContext[],
  group: {
    dayOfWeek: number;
    meetStartTime: string;
    meetEndTime: string;
    preference: GroupPreference;
  },
) {
  return students
    .map((student) =>
      buildCompatibilityWarnings({
        group,
        userId: student.user_id,
        studentName: student.full_name ?? "Unknown",
        studentPreference: student.preference ?? "no_preference",
        availabilitySlotIndexes: student.availabilitySlotIndexes,
      }),
    )
    .filter((warning): warning is CompatibilityWarning => warning !== null);
}

function getAlreadyGroupedStudents(students: ManualStudentContext[]) {
  return students.filter((student) => (student.member_of?.length ?? 0) > 0);
}

function getIndependentStudyStudents(students: ManualStudentContext[]) {
  return students.filter((student) => student.study_mode === "independent");
}

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

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const { error: memberError } = await supabase
    .from("member_of")
    .delete()
    .eq("group_id", groupId);

  if (memberError) {
    console.error("Error deleting group members:", memberError);
    return { error: "Failed to delete group members" };
  }

  const { error: groupError } = await supabase
    .from("group")
    .delete()
    .eq("id", groupId);

  if (groupError) {
    console.error("Error deleting group:", groupError);
    return { error: "Failed to delete group" };
  }

  revalidatePath("/admin/groups");
  return { success: true };
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

function getRoomDays(roomDay: RoomDayRow) {
  if (!roomDay) {
    return [];
  }

  const entries = Array.isArray(roomDay) ? roomDay : [roomDay];
  return entries
    .map((entry) => entry.day)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 4)
    .sort((left, right) => left - right);
}

async function loadRoomInventory(
  supabase: SupabaseClient,
): Promise<{ rooms: RoomInventory[] } | { error: string }> {
  const { data: rooms, error } = await supabase
    .from("room")
    .select("id, building, room_number, group_capacity, room_day(day)");

  if (error) {
    console.error("Error fetching rooms:", error);
    return { error: "Failed to load room inventory" };
  }

  return {
    rooms: ((rooms ?? []) as RoomRow[]).map((room) => ({
      id: room.id,
      building: room.building,
      roomNumber: room.room_number,
      groupCapacity: room.group_capacity ?? DEFAULT_ROOM_GROUP_CAPACITY,
      availableDays: getRoomDays(room.room_day),
    })),
  };
}

async function loadExistingRoomUsage(
  supabase: SupabaseClient,
): Promise<{ usage: ExistingRoomUsage[] } | { error: string }> {
  const { data, error } = await supabase
    .from("group")
    .select("room_id, day_of_week, meet_start_time")
    .eq("preference", "in_person");

  if (error) {
    console.error("Error fetching existing room usage:", error);
    return { error: "Failed to load current room assignments" };
  }

  return {
    usage: ((data ?? []) as ExistingScheduledGroupRow[])
      .filter(
        (group) =>
          group.day_of_week !== null &&
          group.meet_start_time !== null &&
          group.day_of_week >= 0 &&
          group.day_of_week <= 4,
      )
      .map((group) => ({
        roomId: group.room_id,
        dayOfWeek: group.day_of_week ?? 0,
        meetStartTime: group.meet_start_time ?? "",
        groupCount: 1,
      })),
  };
}

function formatFlaggedStudents(students: MatchingStudent[]) {
  return students.map((student) => ({
    user_id: student.user_id,
    full_name: student.full_name,
  }));
}

function buildRoomCandidates(
  groups: {
    preference: "in_person" | "online";
    window: {
      day: number;
      startIndex: number;
    };
  }[],
): RoomAssignmentCandidate[] {
  return groups.map((group) => ({
    preference: group.preference,
    dayOfWeek: group.window.day,
    meetStartTime: slotIndexToTime(group.window.startIndex, group.window.day),
  }));
}

export async function runMatchingAction(
  mode: MatchingMode = "group_ungrouped",
  options?: {
    overrideRoomCapacity?: boolean;
  },
): Promise<MatchingActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  // fetch all student profiles so we can either regroup everyone or only place
  // students who are not already in a group
  const { data: studentProfiles, error: profileError } = await supabase
    .from("profile")
    .select("user_id, full_name, preference, study_mode, member_of(group_id)")
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
      profileRow.study_mode !== "independent" &&
      (mode === "regroup_all"
        ? true
        : !profileRow.member_of || profileRow.member_of.length === 0),
    )
    .map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name ?? "Unknown",
      preference: p.preference ?? "no_preference",
      availability: availabilityByUser[p.user_id] ?? [],
    }));

  const { groups, flagged } = runMatchingAlgorithm(students);
  const flaggedStudents = formatFlaggedStudents(flagged);

  const roomInventoryResult = await loadRoomInventory(supabase);
  if ("error" in roomInventoryResult) {
    return roomInventoryResult;
  }

  const existingUsageResult =
    mode === "group_ungrouped"
      ? await loadExistingRoomUsage(supabase)
      : { usage: [] };
  if ("error" in existingUsageResult) {
    return existingUsageResult;
  }

  const roomAssignmentPlan = assignRoomsToGroups(
    buildRoomCandidates(groups),
    roomInventoryResult.rooms,
    existingUsageResult.usage,
    options?.overrideRoomCapacity ?? false,
  );

  if (
    roomAssignmentPlan.overflow.length > 0 &&
    !(options?.overrideRoomCapacity ?? false)
  ) {
    return {
      requiresRoomConfirmation: true,
      groupsPreviewCount: groups.length,
      flaggedCount: flaggedStudents.length,
      flagged: flaggedStudents,
      roomOverflow: roomAssignmentPlan.overflow,
    };
  }

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
  let roomlessCount = 0;
  let overbookedCount = 0;

  for (const [index, group] of groups.entries()) {
    const startTime = slotIndexToTime(
      group.window.startIndex,
      group.window.day,
    );
    const endTime = slotIndexToTime(
      group.window.startIndex + 1,
      group.window.day,
    );

    const roomAssignment = roomAssignmentPlan.assignments[index] ?? {
      roomId: null,
      overbooked: false,
    };

    const { data: newGroup, error: groupError } = await supabase
      .from("group")
      .insert({
        preference: group.preference,
        day_of_week: group.window.day,
        meet_start_time: startTime,
        meet_end_time: endTime,
        room_id: roomAssignment.roomId,
        room_overbooked: roomAssignment.overbooked,
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

    if (group.preference === "in_person" && roomAssignment.roomId === null) {
      roomlessCount++;
    }

    if (roomAssignment.overbooked) {
      overbookedCount++;
    }

    groupsCreated++;
  }

  revalidatePath("/admin/groups");
  revalidatePath("/student/group");

  return {
    groupsCreated,
    flaggedCount: flaggedStudents.length,
    flagged: flaggedStudents,
    roomOverflowCount: roomAssignmentPlan.overflow.length,
    roomOverflow: roomAssignmentPlan.overflow,
    roomlessCount,
    overbookedCount,
  };
}

export async function createManualGroup(
  input: ManualGroupInput,
): Promise<ManualActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const duplicateStudentIds = new Set<string>();
  const uniqueStudentIds = new Set<string>();

  for (const studentId of input.studentIds) {
    if (uniqueStudentIds.has(studentId)) {
      duplicateStudentIds.add(studentId);
    }
    uniqueStudentIds.add(studentId);
  }

  if (duplicateStudentIds.size > 0) {
    return { error: "Each student can only be selected once." };
  }

  const validation = validateManualGroupInput(input);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const selectedStudentIds = [...uniqueStudentIds];
  const studentResult = await loadStudentContexts(supabase, selectedStudentIds);
  if ("error" in studentResult) {
    return studentResult;
  }

  const students = studentResult.students;
  if (students.length !== selectedStudentIds.length) {
    return { error: "One or more selected students could not be found." };
  }

  const alreadyGroupedStudents = getAlreadyGroupedStudents(students);
  if (alreadyGroupedStudents.length > 0) {
    return {
      error:
        alreadyGroupedStudents.length === 1
          ? `${alreadyGroupedStudents[0]?.full_name ?? "A selected student"} is already assigned to a group. Refresh and try again.`
          : "One or more selected students are already assigned to a group. Refresh and try again.",
    };
  }

  const independentStudyStudents = getIndependentStudyStudents(students);
  if (independentStudyStudents.length > 0) {
    return {
      error:
        independentStudyStudents.length === 1
          ? `${independentStudyStudents[0]?.full_name ?? "A selected student"} is in Independent Study and cannot be added to a group.`
          : "One or more selected students are in Independent Study and cannot be added to a group.",
    };
  }

  const warnings = buildWarningsForStudents(students, validation.value);
  if (warnings.length > 0 && !input.overrideWarnings) {
    return {
      requiresConfirmation: true,
      warnings,
    };
  }

  let manualRoomId: number | null = null;
  let manualRoomOverbooked = false;

  if (validation.value.preference === "in_person") {
    const roomInventoryResult = await loadRoomInventory(supabase);
    if ("error" in roomInventoryResult) {
      return roomInventoryResult;
    }

    const existingUsageResult = await loadExistingRoomUsage(supabase);
    if ("error" in existingUsageResult) {
      return existingUsageResult;
    }

    const assignmentPlan = assignRoomsToGroups(
      [
        {
          preference: "in_person",
          dayOfWeek: validation.value.dayOfWeek,
          meetStartTime: validation.value.meetStartTime,
        },
      ],
      roomInventoryResult.rooms,
      existingUsageResult.usage,
      false,
    );

    manualRoomId = assignmentPlan.assignments[0]?.roomId ?? null;
    manualRoomOverbooked = assignmentPlan.assignments[0]?.overbooked ?? false;
  }

  const { data: newGroup, error: groupError } = await supabase
    .from("group")
    .insert({
      preference: validation.value.preference,
      day_of_week: validation.value.dayOfWeek,
      meet_start_time: validation.value.meetStartTime,
      meet_end_time: validation.value.meetEndTime,
      room_id: manualRoomId,
      room_overbooked: manualRoomOverbooked,
    })
    .select("id")
    .single();

  if (groupError || !newGroup) {
    console.error("Error creating manual group:", groupError);
    return { error: "Failed to create group" };
  }

  if (selectedStudentIds.length > 0) {
    const { error: memberError } = await supabase.from("member_of").insert(
      selectedStudentIds.map((studentId) => ({
        group_id: newGroup.id,
        user_id: studentId,
      })),
    );

    if (memberError) {
      console.error("Error assigning manual group members:", memberError);
      await supabase.from("group").delete().eq("id", newGroup.id);
      return {
        error:
          "Failed to assign one or more students. The group was not created.",
      };
    }
  }

  revalidatePath("/admin/groups");
  revalidatePath("/student/group");

  return {
    success: true,
    warnings,
    assignedCount: selectedStudentIds.length,
    groupId: newGroup.id,
  };
}

export async function assignStudentToGroup(
  input: AssignStudentInput,
): Promise<ManualActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const { data: group, error: groupError } = await supabase
    .from("group")
    .select("id, preference, day_of_week, meet_start_time, meet_end_time")
    .eq("id", input.groupId)
    .single<GroupRow>();

  if (groupError || !group) {
    console.error("Error loading group for manual assignment:", groupError);
    return { error: "Group not found" };
  }

  const validation = validateManualGroupInput({
    dayOfWeek: group.day_of_week ?? -1,
    meetStartTime: group.meet_start_time ?? "",
    meetEndTime: group.meet_end_time ?? "",
    preference: group.preference ?? "online",
  });

  if (!validation.ok) {
    return { error: "This group has invalid scheduling data and cannot accept manual assignments." };
  }

  const studentResult = await loadStudentContexts(supabase, [input.userId]);
  if ("error" in studentResult) {
    return studentResult;
  }

  const student = studentResult.students[0];
  if (!student) {
    return { error: "Student not found" };
  }

  if ((student.member_of?.length ?? 0) > 0) {
    return {
      error: `${student.full_name ?? "This student"} is already assigned to a group. Refresh and try again.`,
    };
  }

  if (student.study_mode === "independent") {
    return {
      error: `${student.full_name ?? "This student"} is in Independent Study and cannot be assigned to a group.`,
    };
  }

  const warnings = buildWarningsForStudents([student], validation.value);
  if (warnings.length > 0 && !input.overrideWarnings) {
    return {
      requiresConfirmation: true,
      warnings,
    };
  }

  const { error: memberError } = await supabase.from("member_of").insert({
    group_id: input.groupId,
    user_id: input.userId,
  });

  if (memberError) {
    console.error("Error manually assigning student to group:", memberError);
    return {
      error: "Failed to assign student. They may already be grouped.",
    };
  }

  revalidatePath("/admin/groups");

  return {
    success: true,
    warnings,
    assignedCount: 1,
  };
}

export async function removeStudentFromGroup({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const { error } = await supabase
    .from("member_of")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing student from group:", error);
    return { error: "Failed to remove student from group" };
  }

  revalidatePath("/admin/groups");

  return { success: true };
}
