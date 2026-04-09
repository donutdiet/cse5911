"use client";

import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  assignStudentToGroup,
  createManualGroup,
  deleteGroup,
  removeStudentFromGroup,
  runMatchingAction,
} from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DAY_NAMES,
  getMeetingLabel,
  GROUP_TIME_OPTIONS,
  type CompatibilityWarning,
  type GroupPreference,
} from "@/lib/group-management";
import { cn } from "@/lib/utils";

type GroupMember = {
  user_id: string;
  profile?:
    | {
        full_name?: string | null;
        email?: string | null;
      }
    | {
        full_name?: string | null;
        email?: string | null;
      }[]
    | null;
};

type Group = {
  id: string;
  preference: string | null;
  day_of_week: number | null;
  meet_start_time: string;
  meet_end_time: string;
  created_at: string;
  member_of: GroupMember[];
};

type FlaggedStudent = {
  user_id: string;
  full_name: string;
};

type MatchingResult = {
  groupsCreated: number;
  flaggedCount: number;
  flagged: FlaggedStudent[];
};

type MatchingMode = "regroup_all" | "group_ungrouped";

type UngroupedStudent = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  profile_picture_url: string | null;
};

type CreateGroupFormState = {
  dayOfWeek: number;
  meetStartTime: string;
  preference: GroupPreference;
  studentIds: string[];
};

const FIELD_CLASSNAME =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function formatMeeting(group: Group) {
  const dayName = DAY_NAMES[group.day_of_week ?? 0] ?? "Unknown day";
  return `${dayName} ${formatTime(group.meet_start_time)} to ${formatTime(group.meet_end_time)}`;
}

function formatPreference(preference: string | null) {
  if (!preference) return "Unknown";
  return preference.replaceAll("_", " ");
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getMemberProfile(member: GroupMember) {
  if (Array.isArray(member.profile)) {
    return member.profile[0] ?? null;
  }

  return member.profile ?? null;
}

function formatStudyMode(
  preference: UngroupedStudent["preference"] | Group["preference"],
) {
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

function getInitials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getEndTimeFromStart(meetStartTime: string) {
  const [hourString] = meetStartTime.split(":");
  const hour = Number.parseInt(hourString, 10);
  return `${String(hour + 1).padStart(2, "0")}:00:00`;
}

function getInputTimeValue(timeString: string) {
  return timeString.slice(0, 5);
}

function formatManualPreference(preference: GroupPreference) {
  return preference === "in_person" ? "In-person" : "Online";
}

function getDefaultCreateFormState(): CreateGroupFormState {
  return {
    dayOfWeek: 0,
    meetStartTime: `${GROUP_TIME_OPTIONS[0]}:00`,
    preference: "in_person",
    studentIds: [],
  };
}

export default function AdminGroupsClient({
  groups,
  ungroupedStudents,
}: {
  groups: Group[];
  ungroupedStudents: UngroupedStudent[];
}) {
  const router = useRouter();

  const [loadingMode, setLoadingMode] = useState<MatchingMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MatchingResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [removingMemberKey, setRemovingMemberKey] = useState<string | null>(
    null,
  );
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGroupFormState>(() =>
    getDefaultCreateFormState(),
  );
  const [createWarnings, setCreateWarnings] = useState<CompatibilityWarning[]>(
    [],
  );
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [assigningStudent, setAssigningStudent] =
    useState<UngroupedStudent | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<string>("");
  const [assignWarnings, setAssignWarnings] = useState<CompatibilityWarning[]>(
    [],
  );
  const [assigningToGroup, setAssigningToGroup] = useState(false);

  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const pushSuccessMessage = useCallback(
    (message: string) => {
      setSuccessMessage(message);
      clearSuccessTimer();
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 6000);
    },
    [clearSuccessTimer],
  );

  useEffect(() => {
    return () => {
      clearResultTimer();
      clearErrorTimer();
      clearSuccessTimer();
    };
  }, [clearErrorTimer, clearResultTimer, clearSuccessTimer]);

  const hasGroups = groups.length > 0;
  const loading = loadingMode !== null;
  const busy =
    loading ||
    creatingGroup ||
    assigningToGroup ||
    deletingGroupId !== null ||
    removingMemberKey !== null;
  const createMeeting = {
    dayOfWeek: createForm.dayOfWeek,
    meetStartTime: createForm.meetStartTime,
    meetEndTime: getEndTimeFromStart(createForm.meetStartTime),
    preference: createForm.preference,
  };
  const selectedAssignGroup =
    groups.find((group) => group.id === assignGroupId) ?? groups[0] ?? null;

  useEffect(() => {
    if (!assigningStudent) {
      return;
    }

    if (!groups.some((group) => group.id === assignGroupId)) {
      setAssignGroupId(groups[0]?.id ?? "");
    }
  }, [assignGroupId, assigningStudent, groups]);

  function closeCreateGroupDialog() {
    setCreateGroupOpen(false);
    setCreateWarnings([]);
    setCreateForm(getDefaultCreateFormState());
  }

  function openCreateGroupDialog() {
    setError(null);
    setCreateWarnings([]);
    setCreateForm(getDefaultCreateFormState());
    setCreateGroupOpen(true);
  }

  function closeAssignDialog() {
    setAssigningStudent(null);
    setAssignGroupId("");
    setAssignWarnings([]);
  }

  function openAssignDialog(student: UngroupedStudent) {
    setError(null);
    setAssignWarnings([]);
    setAssigningStudent(student);
    setAssignGroupId(groups[0]?.id ?? "");
  }

  async function runMatching(mode: MatchingMode) {
    setError(null);
    setLastResult(null);
    setShowResult(false);
    setShowFlagged(false);
    setConfirmRegen(false);
    setLoadingMode(mode);
    clearResultTimer();
    clearErrorTimer();

    try {
      const result = await runMatchingAction(mode);

      if ("error" in result) {
        setError(result.error ?? "Something went wrong");
        errorTimerRef.current = setTimeout(() => setError(null), 8000);
        return;
      }

      const matchResult = result as MatchingResult;
      setLastResult(matchResult);
      setShowResult(true);
      setShowFlagged(matchResult.flaggedCount > 0);

      if (matchResult.flaggedCount === 0) {
        resultTimerRef.current = setTimeout(() => setShowResult(false), 6000);
      }

      router.refresh();
    } catch (err) {
      setError("Something went wrong. Check the terminal for details.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
      console.error("runMatchingAction error:", err);
    } finally {
      setLoadingMode(null);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setDeletingGroupId(groupId);
    setError(null);
    setSuccessMessage(null);
    clearErrorTimer();
    clearSuccessTimer();

    try {
      const result = await deleteGroup(groupId);

      if ("error" in result) {
        setError(result.error ?? "Failed to delete group");
        errorTimerRef.current = setTimeout(() => setError(null), 8000);
        return;
      }

      pushSuccessMessage("Group deleted.");
      router.refresh();
    } catch {
      setError("Failed to delete group. Check the terminal for details.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
    } finally {
      setDeletingGroupId(null);
    }
  }

  async function handleCreateGroup(overrideWarnings = false) {
    setCreatingGroup(true);
    setError(null);
    setSuccessMessage(null);
    clearErrorTimer();
    clearSuccessTimer();

    try {
      const result = await createManualGroup({
        dayOfWeek: createForm.dayOfWeek,
        meetStartTime: createMeeting.meetStartTime,
        meetEndTime: createMeeting.meetEndTime,
        preference: createForm.preference,
        studentIds: createForm.studentIds,
        overrideWarnings,
      });

      if ("error" in result) {
        setError(result.error ?? "Failed to create group");
        errorTimerRef.current = setTimeout(() => setError(null), 8000);
        return;
      }

      if ("requiresConfirmation" in result) {
        setCreateWarnings(result.warnings);
        return;
      }

      closeCreateGroupDialog();
      pushSuccessMessage(
        result.assignedCount && result.assignedCount > 0
          ? `Group created and ${result.assignedCount} student${result.assignedCount === 1 ? "" : "s"} assigned.`
          : "Empty group created.",
      );
      router.refresh();
    } catch (createError) {
      console.error("createManualGroup error:", createError);
      setError("Failed to create group. Check the terminal for details.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleAssignStudent(overrideWarnings = false) {
    if (!assigningStudent || !assignGroupId) {
      setError("Choose a student and target group first.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
      return;
    }

    setAssigningToGroup(true);
    setError(null);
    setSuccessMessage(null);
    clearErrorTimer();
    clearSuccessTimer();

    try {
      const result = await assignStudentToGroup({
        userId: assigningStudent.user_id,
        groupId: assignGroupId,
        overrideWarnings,
      });

      if ("error" in result) {
        setError(result.error ?? "Failed to assign student");
        errorTimerRef.current = setTimeout(() => setError(null), 8000);
        return;
      }

      if ("requiresConfirmation" in result) {
        setAssignWarnings(result.warnings);
        return;
      }

      const studentName = assigningStudent.full_name ?? "Student";
      closeAssignDialog();
      pushSuccessMessage(`${studentName} assigned to group.`);
      router.refresh();
    } catch (assignError) {
      console.error("assignStudentToGroup error:", assignError);
      setError("Failed to assign student. Check the terminal for details.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
    } finally {
      setAssigningToGroup(false);
    }
  }

  async function handleRemoveMember(groupId: string, member: GroupMember) {
    const memberKey = `${groupId}:${member.user_id}`;
    const profile = getMemberProfile(member);

    setRemovingMemberKey(memberKey);
    setError(null);
    setSuccessMessage(null);
    clearErrorTimer();
    clearSuccessTimer();

    try {
      const result = await removeStudentFromGroup({
        groupId,
        userId: member.user_id,
      });

      if ("error" in result) {
        setError(result.error ?? "Failed to remove student from group");
        errorTimerRef.current = setTimeout(() => setError(null), 8000);
        return;
      }

      pushSuccessMessage(
        `${profile?.full_name ?? "Student"} removed from the group.`,
      );
      router.refresh();
    } catch (removeError) {
      console.error("removeStudentFromGroup error:", removeError);
      setError("Failed to remove student. Check the terminal for details.");
      errorTimerRef.current = setTimeout(() => setError(null), 8000);
    } finally {
      setRemovingMemberKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <ManagementDialog
        open={createGroupOpen}
        title="Create group"
        description="Manual groups still follow the app's 1-hour meeting model. Pick a start time, and the end time is set automatically."
        onClose={closeCreateGroupDialog}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="create-group-day">Day of week</Label>
            <select
              id="create-group-day"
              className={FIELD_CLASSNAME}
              value={String(createForm.dayOfWeek)}
              disabled={creatingGroup}
              onChange={(event) => {
                setCreateWarnings([]);
                setCreateForm((current) => ({
                  ...current,
                  dayOfWeek: Number(event.target.value),
                }));
              }}
            >
              {DAY_NAMES.map((dayName, index) => (
                <option key={dayName} value={index}>
                  {dayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-group-start">Start time</Label>
            <select
              id="create-group-start"
              className={FIELD_CLASSNAME}
              value={getInputTimeValue(createForm.meetStartTime)}
              disabled={creatingGroup}
              onChange={(event) => {
                setCreateWarnings([]);
                setCreateForm((current) => ({
                  ...current,
                  meetStartTime: `${event.target.value}:00`,
                }));
              }}
            >
              {GROUP_TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-group-end">End time</Label>
            <Input
              id="create-group-end"
              value={getInputTimeValue(createMeeting.meetEndTime)}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-group-preference">Preference</Label>
          <select
            id="create-group-preference"
            className={FIELD_CLASSNAME}
            value={createForm.preference}
            disabled={creatingGroup}
            onChange={(event) => {
              setCreateWarnings([]);
              setCreateForm((current) => ({
                ...current,
                preference: event.target.value as GroupPreference,
              }));
            }}
          >
            <option value="in_person">In-person</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">Meeting preview</p>
          <p className="text-muted-foreground">
            {getMeetingLabel(createMeeting)} •{" "}
            {formatManualPreference(createMeeting.preference)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Students</Label>
            <span className="text-muted-foreground text-xs">
              {createForm.studentIds.length} selected
            </span>
          </div>

          {ungroupedStudents.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
              No ungrouped students are available. You can still create an empty
              group.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
              {ungroupedStudents.map((student) => {
                const checked = createForm.studentIds.includes(student.user_id);
                return (
                  <label
                    key={student.user_id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={checked}
                      disabled={creatingGroup}
                      onChange={(event) => {
                        setCreateWarnings([]);
                        setCreateForm((current) => ({
                          ...current,
                          studentIds: event.target.checked
                            ? [...current.studentIds, student.user_id]
                            : current.studentIds.filter(
                                (studentId) => studentId !== student.user_id,
                              ),
                        }));
                      }}
                    />
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {student.full_name ?? "No name provided"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {student.email ?? "No email"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatStudyMode(student.preference)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <CompatibilityWarningsCallout warnings={createWarnings} />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={creatingGroup}
            onClick={closeCreateGroupDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={creatingGroup}
            onClick={() => handleCreateGroup(createWarnings.length > 0)}
          >
            {creatingGroup
              ? "Creating..."
              : createWarnings.length > 0
                ? "Create anyway"
                : "Create group"}
          </Button>
        </div>
      </ManagementDialog>

      <ManagementDialog
        open={assigningStudent !== null}
        title="Assign student to group"
        description="Choose an existing group. If the schedule or preference does not fit, the app will warn you before the assignment is committed."
        onClose={closeAssignDialog}
      >
        <div className="space-y-2">
          <Label>Student</Label>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">
              {assigningStudent?.full_name ?? "No name provided"}
            </p>
            <p className="text-muted-foreground">
              {assigningStudent?.email ?? "No email"} •{" "}
              {formatStudyMode(assigningStudent?.preference ?? "no_preference")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-group">Target group</Label>
          <select
            id="assign-group"
            className={FIELD_CLASSNAME}
            value={assignGroupId}
            disabled={assigningToGroup || groups.length === 0}
            onChange={(event) => {
              setAssignWarnings([]);
              setAssignGroupId(event.target.value);
            }}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {formatMeeting(group)} • {formatPreference(group.preference)}
              </option>
            ))}
          </select>
        </div>

        {selectedAssignGroup ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">Selected group</p>
            <p className="text-muted-foreground">
              {formatMeeting(selectedAssignGroup)} •{" "}
              {formatPreference(selectedAssignGroup.preference)}
            </p>
          </div>
        ) : (
          <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            No groups exist yet. Create one first.
          </p>
        )}

        <CompatibilityWarningsCallout warnings={assignWarnings} />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={assigningToGroup}
            onClick={closeAssignDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={assigningToGroup || !selectedAssignGroup}
            onClick={() => handleAssignStudent(assignWarnings.length > 0)}
          >
            {assigningToGroup
              ? "Assigning..."
              : assignWarnings.length > 0
                ? "Assign anyway"
                : "Assign to group"}
          </Button>
        </div>
      </ManagementDialog>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold leading-none">Groups</h1>
            <p className="text-muted-foreground text-sm">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" disabled={busy} onClick={openCreateGroupDialog}>
            <Plus className="h-4 w-4" />
            Create group
          </Button>
          {hasGroups && confirmRegen ? (
            <>
              <p className="text-muted-foreground text-xs">
                This will delete current groups and regroup every student.
              </p>
              <Button
                onClick={() => runMatching("regroup_all")}
                disabled={busy}
                size="sm"
              >
                <RefreshCcw className={cn(loading && "animate-spin")} />
                {loading ? "Running..." : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmRegen(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {hasGroups && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => runMatching("group_ungrouped")}
                >
                  <Users
                    className={cn(
                      loadingMode === "group_ungrouped" && "animate-pulse",
                    )}
                  />
                  {loadingMode === "group_ungrouped"
                    ? "Grouping..."
                    : "Group ungrouped students"}
                </Button>
              )}
              <Button
                type="button"
                variant={hasGroups ? "outline" : "default"}
                disabled={busy}
                onClick={
                  hasGroups
                    ? () => setConfirmRegen(true)
                    : () => runMatching("regroup_all")
                }
              >
                <RefreshCcw
                  className={cn(
                    loadingMode === "regroup_all" && "animate-spin",
                  )}
                />
                {loadingMode === "regroup_all"
                  ? "Running..."
                  : hasGroups
                    ? "Regenerate groups"
                    : "Generate groups"}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            className="shrink-0 rounded-sm p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => {
              setError(null);
              clearErrorTimer();
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 animate-in fade-in slide-in-from-top-1 duration-200 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="flex-1">{successMessage}</p>
          <button
            type="button"
            className="shrink-0 rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
            onClick={() => {
              setSuccessMessage(null);
              clearSuccessTimer();
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      )}

      {lastResult && showResult && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 animate-in fade-in slide-in-from-top-1 duration-200">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="flex-1">
            Created {lastResult.groupsCreated}{" "}
            {lastResult.groupsCreated === 1 ? "group" : "groups"}.{" "}
            {lastResult.flaggedCount === 0
              ? "All students were placed."
              : `${lastResult.flaggedCount} student${lastResult.flaggedCount === 1 ? "" : "s"} could not be placed.`}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-sm p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => {
              setShowResult(false);
              clearResultTimer();
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      )}

      {lastResult && showFlagged && lastResult.flaggedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 space-y-1">
              <h2 className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {lastResult.flaggedCount} unplaced{" "}
                {lastResult.flaggedCount === 1 ? "student" : "students"}
              </h2>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Could not be matched into a valid 1-hour group.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-sm p-0.5 text-amber-700 opacity-70 hover:opacity-100 transition-opacity dark:text-amber-300"
              onClick={() => setShowFlagged(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
          <ul className="mt-3 ml-7 space-y-1.5 text-sm">
            {lastResult.flagged.map((student) => (
              <li
                key={student.user_id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-amber-950 dark:text-amber-100"
              >
                <span className="font-medium">
                  {student.full_name || "Unknown"}
                </span>
                <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
                  {student.user_id.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasGroups ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>No groups yet</CardTitle>
            <CardDescription>
              Run the matching algorithm to assign students into groups based on
              availability and preference.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <Button
              onClick={() => runMatching("regroup_all")}
              disabled={busy}
            >
              <Users />
              {loading ? "Generating..." : "Generate groups"}
            </Button>
            {loading && (
              <p className="text-muted-foreground text-xs">
                Fetching student availability and building groups...
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border">
          <Table>
            <colgroup>
              <col className="w-10" />
              <col className="w-[22rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-muted/100">
                <TableHead className="w-10 px-4" aria-label="Expand" />
                <TableHead className="px-4">Meeting</TableHead>
                <TableHead className="px-4">Preference</TableHead>
                <TableHead className="px-4">Members</TableHead>
                <TableHead className="px-4">Created</TableHead>
                <TableHead className="px-4 text-right">
                  {groups.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mr-2"
                      onClick={() => {
                        const allExpanded =
                          expandedGroupIds.size === groups.length;
                        if (allExpanded) {
                          setExpandedGroupIds(new Set());
                        } else {
                          setExpandedGroupIds(
                            new Set(groups.map((group) => group.id)),
                          );
                        }
                      }}
                    >
                      {expandedGroupIds.size === groups.length ? (
                        <>
                          <ChevronsUpDown className="mr-1.5 h-4 w-4" />
                          Collapse all
                        </>
                      ) : (
                        <>
                          <ChevronsDownUp className="mr-1.5 h-4 w-4" />
                          Expand all
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="sr-only">Actions</span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isExpanded = expandedGroupIds.has(group.id);
                const memberCount = group.member_of?.length ?? 0;

                return (
                  <Fragment key={group.id}>
                    <TableRow key={group.id} className="[&>td]:align-middle">
                      <TableCell className="px-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setExpandedGroupIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.id)) next.delete(group.id);
                              else next.add(group.id);
                              return next;
                            })
                          }
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded ? "Collapse members" : "Expand members"
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="space-y-0.5 whitespace-normal">
                          <div className="font-medium">
                            {formatMeeting(group)}
                          </div>
                          <div className="text-muted-foreground text-xs italic">
                            Building TBD
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground capitalize">
                        {formatPreference(group.preference)}
                      </TableCell>
                      <TableCell className="px-4">
                        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {memberCount}{" "}
                          {memberCount === 1 ? "member" : "members"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {formatCreatedAt(group.created_at)}
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                            {group.id.slice(0, 8)}
                          </span>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={busy}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Open row actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={deletingGroupId === group.id}
                                onClick={() => handleDeleteGroup(group.id)}
                              >
                                <Trash2 className="size-4" />
                                {deletingGroupId === group.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow
                        key={`${group.id}-detail`}
                        className="bg-muted/5 hover:bg-muted/5"
                      >
                        <TableCell
                          colSpan={6}
                          className="bg-muted/100 px-4 py-0"
                        >
                          <div className="ml-10 px-4 py-3">
                            {memberCount === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                No members assigned to this group.
                              </p>
                            ) : (
                              <ul className="space-y-1.5 text-sm">
                                {group.member_of.map((member) =>
                                  (() => {
                                    const profile = getMemberProfile(member);

                                    return (
                                      <li
                                        key={member.user_id}
                                        className="flex flex-wrap items-center justify-between gap-2"
                                      >
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                          <span className="font-medium">
                                            {profile?.full_name ?? "Unknown"}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {profile?.email ?? "No email"}
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          size="xs"
                                          variant="ghost"
                                          disabled={
                                            busy ||
                                            removingMemberKey ===
                                              `${group.id}:${member.user_id}`
                                          }
                                          onClick={() =>
                                            handleRemoveMember(group.id, member)
                                          }
                                        >
                                          {removingMemberKey ===
                                          `${group.id}:${member.user_id}`
                                            ? "Removing..."
                                            : "Remove"}
                                        </Button>
                                      </li>
                                    );
                                  })(),
                                )}
                              </ul>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="space-y-4 pt-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold leading-none">Ungrouped Students</h2>
          <p className="text-muted-foreground text-sm">
            {ungroupedStudents.length}{" "}
            {ungroupedStudents.length === 1 ? "student" : "students"}
          </p>
        </div>

        <div className="border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/100">
                <TableHead className="px-4">Full Name</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">Phone Number</TableHead>
                <TableHead className="px-4">Study Mode</TableHead>
                <TableHead className="w-14 px-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ungroupedStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No ungrouped students.
                  </TableCell>
                </TableRow>
              ) : (
                ungroupedStudents.map((student) => (
                  <TableRow
                    key={student.user_id}
                    className="[&>td]:align-middle"
                  >
                    <TableCell className="px-4 align-middle">
                      <div className="flex min-h-9 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium text-muted-foreground">
                          {student.profile_picture_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={student.profile_picture_url}
                                alt={student.full_name ?? "Student profile"}
                                className="h-full w-full object-cover"
                              />
                            </>
                          ) : (
                            <span>{getInitials(student.full_name)}</span>
                          )}
                        </div>
                        <span
                          className={
                            student.full_name
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {student.full_name ?? "No name provided"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {student.email ?? "No email"}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {student.phone ?? "No phone number"}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {formatStudyMode(student.preference)}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={busy}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={groups.length === 0}
                            onClick={() => openAssignDialog(student)}
                          >
                            Assign to group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function ManagementDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg border bg-background shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function CompatibilityWarningsCallout({
  warnings,
}: {
  warnings: CompatibilityWarning[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="space-y-2">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Review these warnings before confirming
          </p>
          <ul className="space-y-2 text-amber-900 dark:text-amber-200">
            {warnings.map((warning) => (
              <li key={warning.userId} className="rounded-md border border-amber-200/80 px-3 py-2 dark:border-amber-800/80">
                <p className="font-medium">{warning.studentName}</p>
                <ul className="mt-1 list-disc pl-5">
                  {warning.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
