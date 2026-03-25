"use client";

import {
  ArrowLeft,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSection,
  createTask,
  deleteSection,
  deleteTask,
  updateSection,
  updateTask,
} from "@/app/admin/agendas/[id]/action";
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

type Task = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type SectionType = "solo" | "group";

const SECTION_TYPE_OPTIONS: SectionType[] = ["solo", "group"];

type Section = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  type: SectionType;
  order: number | null;
  tasks: Task[];
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  sections: Section[];
};

function parseOrder(value: string): number | null {
  const n = Number.parseInt(value.trim(), 10);
  return value.trim() === "" || !Number.isInteger(n) || n <= 0 ? null : n;
}

function sortByOrder<T extends { order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.order ?? Number.POSITIVE_INFINITY;
    return aOrder - bOrder;
  });
}

export function SectionManager({ agenda }: { agenda: Agenda }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionError, setActionError] = useState<string | null>(null);

  const [showCreateSectionForm, setShowCreateSectionForm] = useState(false);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);

  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(
    null,
  );
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const [createSectionTitle, setCreateSectionTitle] = useState("");
  const [createSectionDescription, setCreateSectionDescription] = useState("");
  const [createSectionType, setCreateSectionType] =
    useState<SectionType>("group");
  const [createSectionOrder, setCreateSectionOrder] = useState("");

  const [createTaskSectionId, setCreateTaskSectionId] = useState("");
  const [createTaskTitle, setCreateTaskTitle] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskLink, setCreateTaskLink] = useState("");
  const [createTaskOrder, setCreateTaskOrder] = useState("");

  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionDescription, setEditSectionDescription] = useState("");
  const [editSectionType, setEditSectionType] = useState<SectionType>("solo");
  const [editSectionOrder, setEditSectionOrder] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskSectionId, setEditTaskSectionId] = useState("");
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskLink, setEditTaskLink] = useState("");
  const [editTaskOrder, setEditTaskOrder] = useState("");

  const sections = useMemo(
    () => sortByOrder(agenda.sections ?? []),
    [agenda.sections],
  );
  const tasks = useMemo(
    () =>
      sortByOrder(
        sections.flatMap((section) =>
          (section.tasks ?? []).map((task) => ({
            ...task,
            sectionTitle: section.title,
          })),
        ),
      ),
    [sections],
  );

  const resetCreateSectionForm = () => {
    setCreateSectionTitle("");
    setCreateSectionDescription("");
    setCreateSectionType("solo");
    setCreateSectionOrder("");
    setShowCreateSectionForm(false);
  };

  const resetCreateTaskForm = () => {
    setCreateTaskSectionId(sections[0] ? String(sections[0].id) : "");
    setCreateTaskTitle("");
    setCreateTaskDescription("");
    setCreateTaskLink("");
    setCreateTaskOrder("");
    setShowCreateTaskForm(false);
  };

  const beginEditSection = (section: Section) => {
    setActionError(null);
    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description ?? "");
    setEditSectionType(section.type);
    setEditSectionOrder(section.order != null ? String(section.order) : "");
  };

  const cancelEditSection = () => {
    setEditingSectionId(null);
    setEditSectionTitle("");
    setEditSectionDescription("");
    setEditSectionType("solo");
    setEditSectionOrder("");
  };

  const beginEditTask = (task: Task) => {
    setActionError(null);
    setEditingTaskId(task.id);
    setEditTaskSectionId(String(task.section_id));
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description ?? "");
    setEditTaskLink(task.link ?? "");
    setEditTaskOrder(task.order != null ? String(task.order) : "");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskSectionId("");
    setEditTaskTitle("");
    setEditTaskDescription("");
    setEditTaskLink("");
    setEditTaskOrder("");
  };

  const handleCreateSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      try {
        await createSection(
          agenda.id,
          createSectionTitle.trim(),
          createSectionDescription.trim() || null,
          createSectionType,
          parseOrder(createSectionOrder),
        );
        resetCreateSectionForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create section.",
        );
      }
    });
  };

  const handleUpdateSection = (sectionId: number) => {
    setActionError(null);

    startTransition(async () => {
      try {
        await updateSection(
          sectionId,
          agenda.id,
          editSectionTitle.trim(),
          editSectionDescription.trim() || null,
          editSectionType,
          parseOrder(editSectionOrder),
        );
        cancelEditSection();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to update section.",
        );
      }
    });
  };

  const handleDeleteSection = (sectionId: number) => {
    setActionError(null);
    setDeletingSectionId(sectionId);

    startTransition(async () => {
      try {
        await deleteSection(sectionId, agenda.id);
        if (editingSectionId === sectionId) {
          cancelEditSection();
        }
        if (editingTaskId != null) {
          const editingTaskStillExists = tasks.some(
            (task) =>
              task.id === editingTaskId && task.section_id !== sectionId,
          );
          if (!editingTaskStillExists) {
            cancelEditTask();
          }
        }
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to delete section.",
        );
      } finally {
        setDeletingSectionId(null);
      }
    });
  };

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    const parsedSectionId = Number.parseInt(createTaskSectionId, 10);
    if (!Number.isInteger(parsedSectionId) || parsedSectionId <= 0) {
      setActionError("Select a section before creating a task.");
      return;
    }

    startTransition(async () => {
      try {
        await createTask(
          parsedSectionId,
          agenda.id,
          createTaskTitle.trim(),
          createTaskDescription.trim() || null,
          createTaskLink.trim() || null,
          parseOrder(createTaskOrder),
        );
        resetCreateTaskForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create task.",
        );
      }
    });
  };

  const handleUpdateTask = (taskId: number) => {
    setActionError(null);

    const parsedSectionId = Number.parseInt(editTaskSectionId, 10);
    if (!Number.isInteger(parsedSectionId) || parsedSectionId <= 0) {
      setActionError("Select a section before saving a task.");
      return;
    }

    startTransition(async () => {
      try {
        await updateTask(
          taskId,
          agenda.id,
          parsedSectionId,
          editTaskTitle.trim(),
          editTaskDescription.trim() || null,
          editTaskLink.trim() || null,
          parseOrder(editTaskOrder),
        );
        cancelEditTask();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to update task.",
        );
      }
    });
  };

  const handleDeleteTask = (taskId: number) => {
    setActionError(null);
    setDeletingTaskId(taskId);

    startTransition(async () => {
      try {
        await deleteTask(taskId, agenda.id);
        if (editingTaskId === taskId) {
          cancelEditTask();
        }
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to delete task.",
        );
      } finally {
        setDeletingTaskId(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/admin/agendas" className="space-y-10">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to agendas
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-3">
            <h1 className="text-xl font-semibold">{agenda.title}</h1>
            <span className="inline-flex h-6 w-16 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
              Week {agenda.week}
            </span>
            <p className="text-muted-foreground text-sm">
              {sections.length} {sections.length === 1 ? "section" : "sections"}{" "}
              and {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </p>
          </div>
        </div>
        {agenda.description && (
          <p className="text-muted-foreground text-sm">{agenda.description}</p>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Sections</h2>
            <p className="text-sm text-muted-foreground">
              Manage the section rows that belong to this agenda.
            </p>
          </div>
          {!showCreateSectionForm && (
            <Button
              variant="outline"
              onClick={() => {
                setActionError(null);
                setShowCreateSectionForm(true);
              }}
            >
              <Plus className="size-4" />
              Add section
            </Button>
          )}
        </div>

        {showCreateSectionForm && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>New section</CardTitle>
              <CardDescription>Add a section to this agenda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[6rem_1fr_10rem_1fr]">
                  <div className="grid gap-2">
                    <Label htmlFor="section-order">
                      Order{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="section-order"
                      type="number"
                      min={1}
                      value={createSectionOrder}
                      onChange={(e) => setCreateSectionOrder(e.target.value)}
                      placeholder="1"
                      disabled={isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section-title">Title</Label>
                    <Input
                      id="section-title"
                      value={createSectionTitle}
                      onChange={(e) => setCreateSectionTitle(e.target.value)}
                      placeholder="e.g. Lecture"
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section-type">Type</Label>
                    <select
                      id="section-type"
                      value={createSectionType}
                      onChange={(e) =>
                        setCreateSectionType(e.target.value as SectionType)
                      }
                      required
                      disabled={isPending}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {SECTION_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type[0].toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section-description">
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <textarea
                      id="section-description"
                      value={createSectionDescription}
                      onChange={(e) =>
                        setCreateSectionDescription(e.target.value)
                      }
                      placeholder="Section details..."
                      disabled={isPending}
                      rows={1}
                      className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adding..." : "Add section"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetCreateSectionForm}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="border">
          <Table>
            <colgroup>
              <col className="w-[5rem]" />
              <col className="w-[16rem]" />
              <col className="w-[10rem]" />
              <col />
              <col className="w-14" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Order</TableHead>
                <TableHead className="px-4">Title</TableHead>
                <TableHead className="px-4">Type</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.length === 0 && !showCreateSectionForm ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No sections yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => {
                  const isEditing = editingSectionId === section.id;
                  const isDeleting = deletingSectionId === section.id;

                  if (isEditing) {
                    return (
                      <TableRow key={section.id} className="bg-muted/40">
                        <TableCell className="px-4 align-top">
                          <Input
                            type="number"
                            min={1}
                            value={editSectionOrder}
                            onChange={(e) =>
                              setEditSectionOrder(e.target.value)
                            }
                            disabled={isPending}
                            placeholder="—"
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            value={editSectionTitle}
                            onChange={(e) =>
                              setEditSectionTitle(e.target.value)
                            }
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <select
                            value={editSectionType}
                            onChange={(e) =>
                              setEditSectionType(e.target.value as SectionType)
                            }
                            disabled={isPending}
                            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {SECTION_TYPE_OPTIONS.map((type) => (
                              <option key={type} value={type}>
                                {type[0].toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <textarea
                            value={editSectionDescription}
                            onChange={(e) =>
                              setEditSectionDescription(e.target.value)
                            }
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
                              onClick={cancelEditSection}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => handleUpdateSection(section.id)}
                              disabled={isPending}
                            >
                              {isPending ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={section.id}
                      className={cn(isDeleting && "opacity-50")}
                    >
                      <TableCell className="px-4">
                        {section.order != null ? (
                          <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                            {section.order}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 font-medium">
                        {section.title}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {section.type[0].toUpperCase() + section.type.slice(1)}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        <span className="line-clamp-2">
                          {section.description || (
                            <span className="italic">No description</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-right">
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
                                beginEditSection(section);
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
                                handleDeleteSection(section.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                              {isDeleting ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Tasks</h2>
            <p className="text-sm text-muted-foreground">
              Manage tasks in a flat table and assign each one to a section.
            </p>
          </div>
          {!showCreateTaskForm && (
            <Button
              variant="outline"
              disabled={sections.length === 0}
              onClick={() => {
                setActionError(null);
                setCreateTaskSectionId(
                  sections[0] ? String(sections[0].id) : "",
                );
                setShowCreateTaskForm(true);
              }}
            >
              <Plus className="size-4" />
              Add task
            </Button>
          )}
        </div>

        {showCreateTaskForm && sections.length > 0 && (
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>New task</CardTitle>
              <CardDescription>
                Add a task to one of this agenda&apos;s sections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[12rem_6rem_1fr_1fr_1fr]">
                  <div className="grid gap-2">
                    <Label htmlFor="task-section">Section</Label>
                    <select
                      id="task-section"
                      value={createTaskSectionId}
                      onChange={(e) => setCreateTaskSectionId(e.target.value)}
                      disabled={isPending}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-order">
                      Order{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="task-order"
                      type="number"
                      min={1}
                      value={createTaskOrder}
                      onChange={(e) => setCreateTaskOrder(e.target.value)}
                      placeholder="1"
                      disabled={isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-title">Title</Label>
                    <Input
                      id="task-title"
                      value={createTaskTitle}
                      onChange={(e) => setCreateTaskTitle(e.target.value)}
                      placeholder="e.g. Complete reading assignment"
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-description">
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <textarea
                      id="task-description"
                      value={createTaskDescription}
                      onChange={(e) => setCreateTaskDescription(e.target.value)}
                      placeholder="Task details..."
                      disabled={isPending}
                      rows={1}
                      className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-link">
                      Link{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="task-link"
                      type="url"
                      value={createTaskLink}
                      onChange={(e) => setCreateTaskLink(e.target.value)}
                      placeholder="https://..."
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adding..." : "Add task"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetCreateTaskForm}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="border">
          <Table>
            <colgroup>
              <col className="w-[12rem]" />
              <col className="w-[5rem]" />
              <col className="w-[16rem]" />
              <col />
              <col className="w-[16rem]" />
              <col className="w-14" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Section</TableHead>
                <TableHead className="px-4">Order</TableHead>
                <TableHead className="px-4">Title</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4">Link</TableHead>
                <TableHead className="px-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 && !showCreateTaskForm ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {sections.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Create a section before adding tasks.
                      </p>
                    )}
                    No tasks yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => {
                  const isEditing = editingTaskId === task.id;
                  const isDeleting = deletingTaskId === task.id;

                  if (isEditing) {
                    return (
                      <TableRow key={task.id} className="bg-muted/40">
                        <TableCell className="px-4 align-top">
                          <select
                            value={editTaskSectionId}
                            onChange={(e) =>
                              setEditTaskSectionId(e.target.value)
                            }
                            disabled={isPending}
                            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.title}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            type="number"
                            min={1}
                            value={editTaskOrder}
                            onChange={(e) => setEditTaskOrder(e.target.value)}
                            disabled={isPending}
                            placeholder="—"
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            value={editTaskTitle}
                            onChange={(e) => setEditTaskTitle(e.target.value)}
                            disabled={isPending}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <textarea
                            value={editTaskDescription}
                            onChange={(e) =>
                              setEditTaskDescription(e.target.value)
                            }
                            disabled={isPending}
                            rows={1}
                            className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </TableCell>
                        <TableCell className="px-4 align-top">
                          <Input
                            value={editTaskLink}
                            onChange={(e) => setEditTaskLink(e.target.value)}
                            disabled={isPending}
                            placeholder="https://..."
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="px-4 text-right align-top">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={cancelEditTask}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => handleUpdateTask(task.id)}
                              disabled={isPending}
                            >
                              {isPending ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={task.id}
                      className={cn(isDeleting && "opacity-50")}
                    >
                      <TableCell className="px-4 text-muted-foreground">
                        {task.sectionTitle}
                      </TableCell>
                      <TableCell className="px-4">
                        {task.order != null ? (
                          <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                            {task.order}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        <span className="line-clamp-2">
                          {task.description || (
                            <span className="italic">No description</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                        {task.link ? (
                          <a
                            href={task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5" />
                            Open link
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 text-right">
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
                                beginEditTask(task);
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
                                handleDeleteTask(task.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                              {isDeleting ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
