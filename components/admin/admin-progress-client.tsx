"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  X,
} from "lucide-react";

import {
  runSemesterRollover,
  type SemesterRolloverResult,
  type SemesterRolloverSummary,
} from "@/app/admin/progress/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminGroupProgressRow,
  AdminStudentProgressRow,
} from "@/lib/admin-progress";
import {
  describeSemesterRolloverSelection,
  hasSemesterRolloverSelection,
  ROLLOVER_CONFIRMATION_PHRASE,
  type SemesterRolloverSelection,
} from "@/lib/semester-rollover";

type Props = {
  totalTasks: number;
  totalStudents: number;
  totalGroups: number;
  studentRows: AdminStudentProgressRow[];
  groupRows: AdminGroupProgressRow[];
};

export default function AdminProgressClient({
  totalTasks,
  totalStudents,
  totalGroups,
  studentRows,
  groupRows,
}: Props) {
  const router = useRouter();
  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [rolloverSelection, setRolloverSelection] =
    useState<SemesterRolloverSelection>({
      clearUsersAndProfiles: false,
      clearRooms: false,
      clearAgendas: false,
    });
  const [rolloverResult, setRolloverResult] =
    useState<SemesterRolloverResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSelection = hasSemesterRolloverSelection(rolloverSelection);
  const selectedDescriptions = useMemo(
    () => describeSemesterRolloverSelection(rolloverSelection),
    [rolloverSelection],
  );
  const canSubmitRollover =
    confirmationText.trim() === ROLLOVER_CONFIRMATION_PHRASE && hasSelection;

  const toggleSelection = (key: keyof SemesterRolloverSelection) => {
    setRolloverResult(null);
    setRolloverSelection((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const resetRolloverForm = () => {
    setConfirmationText("");
    setRolloverSelection({
      clearUsersAndProfiles: false,
      clearRooms: false,
      clearAgendas: false,
    });
    setIsConfirmOpen(false);
  };

  const handleRunRollover = () => {
    startTransition(async () => {
      const result = await runSemesterRollover({
        selection: rolloverSelection,
        confirmationText,
      });

      setRolloverResult(result);

      if ("success" in result) {
        resetRolloverForm();
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Published tasks" value={totalTasks} />
        <SummaryCard label="Students" value={totalStudents} />
        <SummaryCard label="Groups" value={totalGroups} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>
              Overall completion across all published tasks for each student.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/progress/export?scope=students">
              <Download className="size-4" />
              Download CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Student</TableHead>
                  <TableHead className="px-4">Email</TableHead>
                  <TableHead className="px-4">Group</TableHead>
                  <TableHead className="px-4">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentRows.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="px-4 font-medium">
                        {row.fullName ?? "No name provided"}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {row.email ?? "No email provided"}
                      </TableCell>
                      <TableCell className="max-w-xs px-4 text-muted-foreground whitespace-normal">
                        {row.groupLabel}
                      </TableCell>
                      <TableCell className="min-w-64 px-4">
                        <ProgressCell
                          completed={row.completedTasks}
                          total={row.totalTasks}
                          percent={row.progressPercent}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Group Progress</CardTitle>
            <CardDescription>
              Overall completion across all member-task combinations for each
              group.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/progress/export?scope=groups">
              <Download className="size-4" />
              Download CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Group</TableHead>
                  <TableHead className="px-4">Members</TableHead>
                  <TableHead className="px-4">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="p-6 text-center text-muted-foreground"
                    >
                      No groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupRows.map((row) => (
                    <TableRow key={row.groupId}>
                      <TableCell className="max-w-sm px-4 font-medium whitespace-normal">
                        {row.groupLabel}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {row.memberCount}
                      </TableCell>
                      <TableCell className="min-w-64 px-4">
                        <ProgressCell
                          completed={row.completedCells}
                          total={row.totalCells}
                          percent={row.progressPercent}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-4 text-left"
            onClick={() => setIsDangerOpen((current) => !current)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                <CardTitle>Semester Rollover</CardTitle>
              </div>
              <CardDescription>
                Clear selected semester data domains. This action is irreversible
                and intentionally harder to trigger than reporting actions.
              </CardDescription>
            </div>
            {isDangerOpen ? (
              <ChevronUp className="mt-1 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {isDangerOpen ? (
          <CardContent className="space-y-4">
            {rolloverResult ? (
              <RolloverResultBanner result={rolloverResult} />
            ) : null}

            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <RolloverOption
                checked={rolloverSelection.clearUsersAndProfiles}
                label="Users + profiles"
                description="Deletes student auth users and clears student profiles, availability, memberships, groups, and task completion."
                onToggle={() => toggleSelection("clearUsersAndProfiles")}
              />
              <RolloverOption
                checked={rolloverSelection.clearAgendas}
                label="Agenda data"
                description="Deletes all agendas, sections, tasks, and any remaining completion rows tied to those tasks."
                onToggle={() => toggleSelection("clearAgendas")}
              />
              <RolloverOption
                checked={rolloverSelection.clearRooms}
                label="Rooms + room days"
                description="Deletes all rooms and room-day availability after clearing room assignments from groups."
                onToggle={() => toggleSelection("clearRooms")}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Selected domains will run in fixed order: users, agendas, then
                rooms.
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={!hasSelection || isPending}
                onClick={() => {
                  setConfirmationText("");
                  setIsConfirmOpen(true);
                }}
              >
                Review rollover
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm semester rollover"
            className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Confirm semester rollover</h2>
                <p className="text-sm text-muted-foreground">
                  Review the exact domains below. This cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
              >
                <span className="sr-only">Close</span>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-sm font-medium">The rollover will clear:</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {selectedDescriptions.map((description) => (
                    <li key={description}>{description}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="rollover-confirm">
                  Type {`"${ROLLOVER_CONFIRMATION_PHRASE}"`} to enable the final
                  rollover
                </label>
                <Input
                  id="rollover-confirm"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder={ROLLOVER_CONFIRMATION_PHRASE}
                  disabled={isPending}
                />
              </div>

              {rolloverResult && "error" in rolloverResult ? (
                <RolloverResultBanner result={rolloverResult} />
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canSubmitRollover || isPending}
                  onClick={handleRunRollover}
                >
                  {isPending ? "Running rollover..." : "Run semester rollover"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ProgressCell({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{percent}%</span>
        <span className="text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RolloverOption({
  checked,
  label,
  description,
  onToggle,
}: {
  checked: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border bg-background p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-input"
        checked={checked}
        onChange={onToggle}
      />
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

function RolloverResultBanner({
  result,
}: {
  result: SemesterRolloverResult;
}) {
  const isSuccess = "success" in result;

  return (
    <div
      className={
        isSuccess
          ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm"
          : "rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm"
      }
    >
      <p className="font-medium">
        {isSuccess ? "Semester rollover completed." : result.error}
      </p>
      <div className="mt-2 text-muted-foreground">
        {formatRolloverSummary(result.summary)}
      </div>
      {result.completedSteps.length > 0 ? (
        <p className="mt-2 text-muted-foreground">
          Completed steps: {result.completedSteps.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function formatRolloverSummary(summary: SemesterRolloverSummary) {
  const parts = [
    `${summary.deletedStudentUsers} auth users`,
    `${summary.deletedProfiles} profiles`,
    `${summary.deletedAvailabilityRows} availability rows`,
    `${summary.deletedMembershipRows} memberships`,
    `${summary.deletedGroups} groups`,
    `${summary.deletedAgendaRows} agendas`,
    `${summary.deletedSectionRows} sections`,
    `${summary.deletedTaskRows} tasks`,
    `${summary.deletedTaskCompletionRows} task completion rows`,
    `${summary.clearedGroupRoomAssignments} cleared room assignments`,
    `${summary.deletedRoomDayRows} room-day rows`,
    `${summary.deletedRoomRows} rooms`,
  ];

  return parts.join(", ");
}
