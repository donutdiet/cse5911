"use client";

import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { runMatchingAction } from "@/lib/actions/admin-actions";
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

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
  const [lastResult, setLastResult] = useState<MatchingResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );

  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      clearResultTimer();
      clearErrorTimer();
    };
  }, [clearResultTimer, clearErrorTimer]);

  const hasGroups = groups.length > 0;
  const loading = loadingMode !== null;

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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold">Groups</h1>
            <p className="text-muted-foreground text-sm">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Review generated meeting groups and expand a row to see members.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasGroups && confirmRegen ? (
            <>
              <p className="text-muted-foreground text-xs">
                This will delete current groups and regroup every student.
              </p>
              <Button
                onClick={() => runMatching("regroup_all")}
                disabled={loading}
                size="sm"
              >
                <RefreshCcw className={cn(loading && "animate-spin")} />
                {loading ? "Running..." : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
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
                  disabled={loading}
                  onClick={() => runMatching("group_ungrouped")}
                >
                  <Users className={cn(loadingMode === "group_ungrouped" && "animate-pulse")} />
                  {loadingMode === "group_ungrouped"
                    ? "Grouping..."
                    : "Group ungrouped students"}
                </Button>
              )}
              <Button
                type="button"
                variant={hasGroups ? "outline" : "default"}
                disabled={loading}
                onClick={
                  hasGroups
                    ? () => setConfirmRegen(true)
                    : () => runMatching("regroup_all")
                }
              >
                <RefreshCcw
                  className={cn(loadingMode === "regroup_all" && "animate-spin")}
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
              disabled={loading}
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
                          <div className="text-muted-foreground text-xs">
                            {formatTime(group.meet_start_time)} to{" "}
                            {formatTime(group.meet_end_time)}
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
                                disabled={loading}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Open row actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" disabled>
                                <Trash2 className="size-4" />
                                Delete
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
                                        className="flex flex-wrap items-center gap-x-2 gap-y-1"
                                      >
                                        <span className="font-medium">
                                          {profile?.full_name ?? "Unknown"}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {profile?.email ?? "No email"}
                                        </span>
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
          <h2 className="text-lg font-semibold">Ungrouped Students</h2>
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
                            disabled={loading}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
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
