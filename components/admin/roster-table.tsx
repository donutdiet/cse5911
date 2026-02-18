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
};

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
              <TableRow key={student.user_id}>
                <TableCell className="px-4 font-medium">
                  {student.full_name ?? "No name provided"}
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
                  Study Mode Placeholder
                </TableCell>
                <TableCell className="px-4 text-right">
                  <DropdownMenu>
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
