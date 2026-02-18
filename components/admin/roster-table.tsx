"use client";

import { MoreHorizontal } from "lucide-react";

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

type Student = {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
};

export function RosterTable({ students }: { students: Student[] }) {
  return (
    <div className="border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Full Name</TableHead>
            <TableHead className="px-4">Email</TableHead>
            <TableHead className="px-4">Group</TableHead>
            <TableHead className="w-14 px-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
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
                  Group Placeholder
                </TableCell>
                <TableCell className="px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open row actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Availability</DropdownMenuItem>
                      <DropdownMenuItem>View Group</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        Remove student
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
