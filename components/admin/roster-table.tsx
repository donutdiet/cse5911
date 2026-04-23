"use client";

import { MoreHorizontal, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import { removeStudent } from "@/lib/actions/admin-actions";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type Group = {
  id: string;
  preference: "in_person" | "online" | null;
  day_of_week: number | null;
  meet_start_time: string | null;
  meet_end_time: string | null;
};

type MemberOfRow = {
  group?: Group | Group[] | null;
};

type Student = {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  preference: "in_person" | "online" | "no_preference" | null;
  profile_picture_url: string | null;
  member_of?: MemberOfRow[] | null;
};

function formatStudyMode(preference: Student["preference"]) {
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

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function getAssignedGroup(student: Student) {
  const membership = student.member_of?.[0];
  if (!membership?.group) {
    return null;
  }

  if (Array.isArray(membership.group)) {
    return membership.group[0] ?? null;
  }

  return membership.group;
}

function formatGroupLabel(group: Group | null) {
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
  const meeting = `${dayName} ${formatTime(group.meet_start_time)} to ${formatTime(group.meet_end_time)}`;
  const preference =
    group.preference === "in_person"
      ? "In-person"
      : group.preference === "online"
        ? "Online"
        : "Unknown";

  return `${meeting} • ${preference}`;
}

export function RosterTable({ students }: { students: Student[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemovalStudent, setPendingRemovalStudent] =
    useState<Student | null>(null);

  const handleRemoveStudent = (studentId: string) => {
    setActionError(null);
    setRemovingStudentId(studentId);

    startTransition(async () => {
      try {
        await removeStudent(studentId);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to remove student.",
        );
      } finally {
        setRemovingStudentId(null);
      }
    });
  };

  return (
    <>
      {pendingRemovalStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Remove student"
            className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Remove student?</h2>
                <p className="text-muted-foreground text-sm">
                  This will permanently remove the student from the roster and
                  cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPendingRemovalStudent(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">
                  {pendingRemovalStudent.full_name ?? "No name provided"}
                </p>
                <p className="text-muted-foreground">
                  {pendingRemovalStudent.email}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={removingStudentId === pendingRemovalStudent.user_id}
                  onClick={() => setPendingRemovalStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={removingStudentId === pendingRemovalStudent.user_id}
                  onClick={async () => {
                    await handleRemoveStudent(pendingRemovalStudent.user_id);
                    setPendingRemovalStudent((current) =>
                      current?.user_id === pendingRemovalStudent.user_id
                        ? null
                        : current,
                    );
                  }}
                >
                  {removingStudentId === pendingRemovalStudent.user_id
                    ? "Removing..."
                    : "Remove student"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Full Name</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4">Phone Number</TableHead>
              <TableHead className="px-4">Group</TableHead>
              <TableHead className="px-4">Study Mode</TableHead>
              <TableHead className="w-14 px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="p-3 text-center text-destructive"
                >
                  {actionError}
                </TableCell>
              </TableRow>
            ) : null}
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="p-4 text-center text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.user_id} className="[&>td]:align-middle">
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
                    {student.email}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {student.phone ?? "No phone number"}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {formatGroupLabel(getAssignedGroup(student))}
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
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open row actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          View Availability
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>View Group</DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            setPendingRemovalStudent(student);
                          }}
                        >
                          {isPending && removingStudentId === student.user_id
                            ? "Removing..."
                            : "Remove student"}
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
    </>
  );
}
