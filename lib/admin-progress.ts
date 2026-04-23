import { createClient } from "@/lib/supabase/server";
import {
  calculateProgressStat,
  getAgendaTaskIds,
  type GroupTaskCompletionState,
  type ProgressAgenda,
} from "@/lib/progress";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type GroupPreference = "in_person" | "online" | "no_preference" | null;

type AdminGroupRecord = {
  id: string;
  preference: GroupPreference;
  day_of_week: number | null;
  meet_start_time: string | null;
  meet_end_time: string | null;
  member_of:
    | {
        user_id: string;
      }[]
    | null;
};

type StudentGroupRecord = {
  id: string;
  preference: GroupPreference;
  day_of_week: number | null;
  meet_start_time: string | null;
  meet_end_time: string | null;
};

type StudentProfileRecord = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  member_of:
    | {
        group: StudentGroupRecord | StudentGroupRecord[] | null;
      }[]
    | null;
};

export type AdminStudentProgressRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  groupId: string | null;
  groupLabel: string;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
};

export type AdminGroupProgressRow = {
  groupId: string;
  groupLabel: string;
  memberCount: number;
  completedCells: number;
  totalCells: number;
  progressPercent: number;
};

export type AdminProgressData = {
  totalTasks: number;
  totalStudents: number;
  totalGroups: number;
  studentRows: AdminStudentProgressRow[];
  groupRows: AdminGroupProgressRow[];
};

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function formatPreference(preference: GroupPreference) {
  switch (preference) {
    case "in_person":
      return "In-person";
    case "online":
      return "Online";
    case "no_preference":
    default:
      return "No preference";
  }
}

function getStudentGroup(
  student: StudentProfileRecord,
): StudentGroupRecord | null {
  const membership = student.member_of?.[0];
  if (!membership?.group) {
    return null;
  }

  if (Array.isArray(membership.group)) {
    return membership.group[0] ?? null;
  }

  return membership.group;
}

export function formatAssignedGroupLabel(group: StudentGroupRecord | null) {
  if (!group) {
    return "Not assigned";
  }

  if (
    group.day_of_week === null ||
    !group.meet_start_time ||
    !group.meet_end_time
  ) {
    return "Group assigned";
  }

  const dayName = DAY_NAMES[group.day_of_week] ?? "Unknown day";
  return `${dayName} ${formatTime(group.meet_start_time)} to ${formatTime(group.meet_end_time)} • ${formatPreference(group.preference)}`;
}

export function formatGroupRowLabel(group: AdminGroupRecord) {
  if (
    group.day_of_week === null ||
    !group.meet_start_time ||
    !group.meet_end_time
  ) {
    return `Group ${group.id.slice(0, 8)}`;
  }

  const dayName = DAY_NAMES[group.day_of_week] ?? "Unknown day";
  return `${dayName} ${formatTime(group.meet_start_time)} to ${formatTime(group.meet_end_time)} • ${formatPreference(group.preference)}`;
}

async function requireAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not logged in");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin access");
  }

  if (profile?.role !== "admin") {
    throw new Error("Admin only");
  }

  return supabase;
}

export async function getAdminProgressData(): Promise<AdminProgressData> {
  const supabase = await requireAdminAccess();

  const { data: agendasData, error: agendasError } = await supabase
    .from("agenda")
    .select(
      `
      id,
      title,
      description,
      start_date,
      end_date,
      sections:section(
        id,
        agenda_id,
        tasks:task(id)
      )
    `,
    )
    .order("start_date", { ascending: true })
    .order("week", { ascending: true });

  if (agendasError) {
    throw new Error("Failed to load agenda progress.");
  }

  const agendas = (agendasData ?? []) as ProgressAgenda[];
  const allTaskIds = agendas.flatMap((agenda) => getAgendaTaskIds(agenda));
  const totalTasks = allTaskIds.length;

  const { data: studentsData, error: studentsError } = await supabase
    .from("profile")
    .select(
      `
      user_id,
      full_name,
      email,
      member_of(
        group(
          id,
          preference,
          day_of_week,
          meet_start_time,
          meet_end_time
        )
      )
    `,
    )
    .eq("role", "student")
    .order("full_name", { ascending: true, nullsFirst: false });

  if (studentsError) {
    throw new Error("Failed to load student progress.");
  }

  const students = (studentsData ?? []) as StudentProfileRecord[];
  const studentIds = students.map((student) => student.user_id);

  const { data: groupsData, error: groupsError } = await supabase
    .from("group")
    .select(
      `
      id,
      preference,
      day_of_week,
      meet_start_time,
      meet_end_time,
      member_of(user_id)
    `,
    )
    .order("created_at", { ascending: false });

  if (groupsError) {
    throw new Error("Failed to load group progress.");
  }

  const groups = (groupsData ?? []) as AdminGroupRecord[];

  const { data: completionData, error: completionError } =
    studentIds.length > 0 && allTaskIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("user_id, task_id, completed")
          .in("user_id", studentIds)
          .in("task_id", allTaskIds)
      : {
          data: [] as GroupTaskCompletionState[],
          error: null,
        };

  if (completionError) {
    throw new Error("Failed to load completion progress.");
  }

  const completions = (completionData ?? []) as GroupTaskCompletionState[];
  const completedTaskIdsByUser = new Map<string, Set<number>>();
  const completedCellCountByGroup = new Map<string, number>();

  for (const row of completions) {
    if (!row.completed) continue;

    const completedTaskIds =
      completedTaskIdsByUser.get(row.user_id) ?? new Set<number>();
    completedTaskIds.add(row.task_id);
    completedTaskIdsByUser.set(row.user_id, completedTaskIds);
  }

  const groupIdsByStudent = new Map<string, string>();

  for (const student of students) {
    const group = getStudentGroup(student);
    if (group) {
      groupIdsByStudent.set(student.user_id, group.id);
    }
  }

  for (const row of completions) {
    if (!row.completed) continue;

    const groupId = groupIdsByStudent.get(row.user_id);
    if (!groupId) continue;

    completedCellCountByGroup.set(
      groupId,
      (completedCellCountByGroup.get(groupId) ?? 0) + 1,
    );
  }

  const studentRows = students.map((student) => {
    const group = getStudentGroup(student);
    const completedTasks =
      completedTaskIdsByUser.get(student.user_id)?.size ?? 0;
    const progress = calculateProgressStat(completedTasks, totalTasks);

    return {
      userId: student.user_id,
      fullName: student.full_name,
      email: student.email,
      groupId: group?.id ?? null,
      groupLabel: formatAssignedGroupLabel(group),
      completedTasks: progress.completed,
      totalTasks: progress.total,
      progressPercent: progress.percent,
    };
  });

  const groupRows = groups.map((group) => {
    const memberCount = group.member_of?.length ?? 0;
    const totalCells = memberCount * totalTasks;
    const completedCells = completedCellCountByGroup.get(group.id) ?? 0;
    const progress = calculateProgressStat(completedCells, totalCells);

    return {
      groupId: group.id,
      groupLabel: formatGroupRowLabel(group),
      memberCount,
      completedCells: progress.completed,
      totalCells: progress.total,
      progressPercent: progress.percent,
    };
  });

  return {
    totalTasks,
    totalStudents: students.length,
    totalGroups: groups.length,
    studentRows,
    groupRows,
  };
}

export function serializeStudentProgressCsv(rows: AdminStudentProgressRow[]) {
  return toCsv([
    [
      "student_name",
      "email",
      "group_id",
      "group_label",
      "completed_tasks",
      "total_tasks",
      "progress_percent",
    ],
    ...rows.map((row) => [
      row.fullName ?? "",
      row.email ?? "",
      row.groupId ?? "",
      row.groupLabel,
      String(row.completedTasks),
      String(row.totalTasks),
      String(row.progressPercent),
    ]),
  ]);
}

export function serializeGroupProgressCsv(rows: AdminGroupProgressRow[]) {
  return toCsv([
    [
      "group_id",
      "group_label",
      "member_count",
      "completed_cells",
      "total_cells",
      "progress_percent",
    ],
    ...rows.map((row) => [
      row.groupId,
      row.groupLabel,
      String(row.memberCount),
      String(row.completedCells),
      String(row.totalCells),
      String(row.progressPercent),
    ]),
  ]);
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
