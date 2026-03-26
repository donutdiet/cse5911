"use client";

import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { FormEvent, Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAgenda,
  deleteAgenda,
  updateAgenda,
} from "@/app/admin/agendas/action";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Task = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type SectionType = "solo" | "group";

type Section = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  type: SectionType;
  order: number | null;
  tasks?: Task[];
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  start_date: string;
  end_date: string;
  sections?: Section[];
};

function formatAgendaDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function AgendaManager({ agendas }: { agendas: Agenda[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createWeek, setCreateWeek] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");

  const [expandedAgendaIds, setExpandedAgendaIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [editingAgendaId, setEditingAgendaId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWeek, setEditWeek] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateWeek("");
    setCreateStartDate("");
    setCreateEndDate("");
    setShowCreateForm(false);
  };

  const beginEdit = (agenda: Agenda) => {
    setActionError(null);
    setEditingAgendaId(agenda.id);
    setEditTitle(agenda.title);
    setEditDescription(agenda.description ?? "");
    setEditWeek(String(agenda.week));
    setEditStartDate(agenda.start_date);
    setEditEndDate(agenda.end_date);
  };

  const cancelEdit = () => {
    setEditingAgendaId(null);
    setEditTitle("");
    setEditDescription("");
    setEditWeek("");
    setEditStartDate("");
    setEditEndDate("");
  };

  const handleCreateAgenda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    const parsedWeek = Number.parseInt(createWeek, 10);
    if (!Number.isInteger(parsedWeek) || parsedWeek <= 0) {
      setActionError("Week must be a positive integer.");
      return;
    }
    if (!createStartDate || !createEndDate) {
      setActionError("Start date and end date are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createAgenda(
          createTitle.trim(),
          createDescription.trim() || null,
          parsedWeek,
          createStartDate,
          createEndDate,
        );
        resetCreateForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create agenda.",
        );
      }
    });
  };

  const handleUpdateAgenda = (agendaId: number) => {
    setActionError(null);

    const parsedWeek = Number.parseInt(editWeek, 10);
    if (!Number.isInteger(parsedWeek) || parsedWeek <= 0) {
      setActionError("Week must be a positive integer.");
      return;
    }
    if (!editStartDate || !editEndDate) {
      setActionError("Start date and end date are required.");
      return;
    }

    startTransition(async () => {
      try {
        await updateAgenda(
          agendaId,
          editTitle.trim(),
          editDescription.trim() || null,
          parsedWeek,
          editStartDate,
          editEndDate,
        );
        cancelEdit();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to update agenda.",
        );
      }
    });
  };

  const handleDeleteAgenda = (agendaId: number) => {
    setActionError(null);
    setDeletingId(agendaId);

    startTransition(async () => {
      try {
        await deleteAgenda(agendaId);
        if (editingAgendaId === agendaId) cancelEdit();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to delete agenda.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      {/* Collapsible create form */}
      {showCreateForm ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>New agenda</CardTitle>
            <CardDescription>
              Each week can only have one agenda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAgenda} className="space-y-4">
              <div className="grid items-start gap-4 lg:grid-cols-[5rem_16rem_11rem_11rem_1fr]">
                <div className="grid gap-2">
                  <Label htmlFor="agenda-week">Week</Label>
                  <Input
                    id="agenda-week"
                    type="number"
                    min={1}
                    value={createWeek}
                    onChange={(e) => setCreateWeek(e.target.value)}
                    placeholder="1"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-title">Title</Label>
                  <Input
                    id="agenda-title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Midterm 1 Review"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid\ gap-2">
                  <Label htmlFor="agenda-start-date">Start date</Label>
                  <Input
                    id="agenda-start-date"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-end-date">End date</Label>
                  <Input
                    id="agenda-end-date"
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-description">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <textarea
                    id="agenda-description"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="e.g. Review the topics covered this week (Chapters 1-3)"
                    disabled={isPending}
                    rows={1}
                    className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create agenda"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetCreateForm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setActionError(null);
            setShowCreateForm(true);
          }}
        >
          <CalendarPlus className="size-4" />
          Add agenda
        </Button>
      )}

      {/* Agenda table */}
      <div className="border">
        <Table>
          <colgroup>
            <col className="w-10" />
            <col className="w-[5rem]" />
            <col className="w-[16rem]" />
            <col className="w-[10rem]" />
            <col className="w-[10rem]" />
            <col />
            <col className="w-14" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/100">
              <TableHead className="w-10 px-4" aria-label="Expand" />
              <TableHead className="px-4">Week</TableHead>
              <TableHead className="px-4">Title</TableHead>
              <TableHead className="px-4">Start date</TableHead>
              <TableHead className="px-4">End date</TableHead>
              <TableHead className="px-4">Description</TableHead>
              <TableHead className="px-4 text-right">
                {agendas.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-mr-2"
                    onClick={() => {
                      const allExpanded =
                        expandedAgendaIds.size === agendas.length;
                      if (allExpanded) {
                        setExpandedAgendaIds(new Set());
                      } else {
                        setExpandedAgendaIds(new Set(agendas.map((a) => a.id)));
                      }
                    }}
                  >
                    {expandedAgendaIds.size === agendas.length ? (
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
            {agendas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No agendas yet.
                </TableCell>
              </TableRow>
            ) : (
              agendas.map((agenda) => {
                const isEditing = editingAgendaId === agenda.id;
                const isDeleting = deletingId === agenda.id;
                const isExpanded = expandedAgendaIds.has(agenda.id);
                const sections = [...(agenda.sections ?? [])]
                  .sort((a, b) => {
                    const oa = a.order ?? Infinity;
                    const ob = b.order ?? Infinity;
                    return oa - ob;
                  })
                  .map((section) => ({
                    ...section,
                    tasks: [...(section.tasks ?? [])].sort((a, b) => {
                      const oa = a.order ?? Infinity;
                      const ob = b.order ?? Infinity;
                      return oa - ob;
                    }),
                  }));
                const taskCount = sections.reduce(
                  (count, section) => count + (section.tasks?.length ?? 0),
                  0,
                );

                const expandCell = (
                  <TableCell className="w-10 px-4 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setExpandedAgendaIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(agenda.id)) next.delete(agenda.id);
                          else next.add(agenda.id);
                          return next;
                        })
                      }
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? "Collapse sections" : "Expand sections"
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                );

                const detailRow = isExpanded ? (
                  <TableRow
                    key={`${agenda.id}-detail`}
                    className="bg-muted/5 hover:bg-muted/5"
                  >
                    <TableCell colSpan={7} className="px-4 py-3mb bg-muted/100">
                      <div className="ml-10 px-4 py-3">
                        <div className="max-h-48 overflow-y-auto">
                          {sections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No sections
                            </p>
                          ) : (
                            <ul className="space-y-2.5 text-sm">
                              {sections.map((section) => (
                                <li key={section.id} className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-medium">
                                      {section.order != null
                                        ? `${section.order}. ${section.title}`
                                        : section.title}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {section.description || "No description"}
                                    </span>
                                    <div className="ml-1 inline-flex items-center gap-1.5 border-l pl-3">
                                      <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        {section.type[0].toUpperCase() +
                                          section.type.slice(1)}
                                      </span>
                                      <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        {section.tasks?.length ?? 0}{" "}
                                        {(section.tasks?.length ?? 0) === 1
                                          ? "task"
                                          : "tasks"}
                                      </span>
                                    </div>
                                  </div>
                                  {section.tasks &&
                                    section.tasks.length > 0 && (
                                      <ul className="ml-4 space-y-1.5 text-muted-foreground">
                                        {section.tasks.map((task) => (
                                          <li
                                            key={task.id}
                                            className="flex flex-wrap items-center gap-x-2 gap-y-1"
                                          >
                                            <span className="font-medium text-foreground">
                                              {task.order != null
                                                ? `${task.order}. ${task.title}`
                                                : task.title}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {task.description || "No description"}
                                            </span>
                                            {task.link && (
                                              <a
                                                href={task.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 text-primary hover:underline"
                                                aria-label="Open link"
                                              >
                                                <ExternalLink className="size-3.5" />
                                              </a>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null;

                if (isEditing) {
                  return (
                    <Fragment key={agenda.id}>
                      <TableRow className="bg-muted/40">
                        {expandCell}
                        <TableCell className="px-4 align-top">
                          <Input
                            type="number"
                            min={1}
                            value={editWeek}
                            onChange={(e) => setEditWeek(e.target.value)}
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            disabled={isPending}
                            rows={1}
                            className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </TableCell>
                        <TableCell className="px-4 text-right align-top">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => handleUpdateAgenda(agenda.id)}
                              disabled={isPending}
                            >
                              {isPending ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {detailRow}
                    </Fragment>
                  );
                }

                return (
                  <Fragment key={agenda.id}>
                    <TableRow
                      className={cn(isDeleting && "opacity-50", "[&>td]:align-middle")}
                    >
                      {expandCell}
                      <TableCell className="px-4">
                        <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                          {agenda.week}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 font-medium">
                        <Link
                          href={`/admin/agendas/${agenda.id}`}
                          className="text-primary underline-offset-2 hover:underline focus-visible:underline"
                        >
                          {agenda.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {formatAgendaDate(agenda.start_date)}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {formatAgendaDate(agenda.end_date)}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        <span className="line-clamp-1">
                          {agenda.description}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="hidden items-center gap-1.5 sm:inline-flex">
                            <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {agenda.sections?.length ?? 0}{" "}
                              {(agenda.sections?.length ?? 0) === 1
                                ? "section"
                                : "sections"}
                            </span>
                            <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {taskCount} {taskCount === 1 ? "task" : "tasks"}
                            </span>
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={isPending || isDeleting}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open row actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  beginEdit(agenda);
                                }}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={isDeleting}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDeleteAgenda(agenda.id);
                                }}
                              >
                                <Trash2 className="size-4" />
                                {isDeleting ? "Deleting..." : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {detailRow}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
