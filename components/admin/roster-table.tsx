"use client";

import { MoreHorizontal } from "lucide-react";
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

type Student = {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  preference: "in_person" | "online" | "no_preference" | null;
  profile_picture_url: string | null;
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

export function RosterTable({ students }: { students: Student[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRemoveStudent = (studentId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this student from the roster? This action cannot be undone.",
      )
    )
      return;

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
                colSpan={4}
                className="p-3 text-center text-destructive"
              >
                {actionError}
              </TableCell>
            </TableRow>
          ) : null}
          {students.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
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
                        <img
                          src={student.profile_picture_url}
                          alt={student.full_name ?? "Student profile"}
                          className="h-full w-full object-cover"
                        />
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
                  Phone Number Placeholder
                </TableCell>
                <TableCell className="px-4 text-muted-foreground">
                  Group Placeholder
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
                      <DropdownMenuItem>View Availability</DropdownMenuItem>
                      <DropdownMenuItem>View Group</DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isPending}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleRemoveStudent(student.user_id);
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
  );
}
