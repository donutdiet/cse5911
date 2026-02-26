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
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTask,
  deleteTask,
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
  agenda_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  tasks: Task[];
};

export function TaskManager({ agenda }: { agenda: Agenda }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLink, setCreateLink] = useState("");
  const [createOrder, setCreateOrder] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editOrder, setEditOrder] = useState("");

  const tasks = [...(agenda.tasks ?? [])].sort((a, b) => {
    const oa = a.order ?? Infinity;
    const ob = b.order ?? Infinity;
    return oa - ob;
  });

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateLink("");
    setCreateOrder("");
    setShowCreateForm(false);
  };

  const beginEdit = (task: Task) => {
    setActionError(null);
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditLink(task.link ?? "");
    setEditOrder(task.order != null ? String(task.order) : "");
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
    setEditLink("");
    setEditOrder("");
  };

  const parseOrder = (value: string): number | null => {
    const n = Number.parseInt(value.trim(), 10);
    return value.trim() === "" || !Number.isInteger(n) || n <= 0
      ? null
      : n;
  };

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      try {
        await createTask(
          agenda.id,
          createTitle.trim(),
          createDescription.trim() || null,
          createLink.trim() || null,
          parseOrder(createOrder),
        );
        resetCreateForm();
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

    startTransition(async () => {
      try {
        await updateTask(
          taskId,
          agenda.id,
          editTitle.trim(),
          editDescription.trim() || null,
          editLink.trim() || null,
          parseOrder(editOrder),
        );
        cancelEdit();
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
    setDeletingId(taskId);

    startTransition(async () => {
      try {
        await deleteTask(taskId, agenda.id);
        if (editingTaskId === taskId) cancelEdit();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to delete task.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
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
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
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

      {/* Collapsible create form - matches agenda manager pattern */}
      {showCreateForm ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>New task</CardTitle>
            <CardDescription>Add a task to this agenda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid items-start gap-4 grid-cols-1 md:grid-cols-[6rem_1fr_1fr_1fr]">
                <div className="grid min-w-0 gap-2">
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
                    value={createOrder}
                    onChange={(e) => setCreateOrder(e.target.value)}
                    placeholder="1"
                    disabled={isPending}
                    className="w-full min-w-0"
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Complete reading assignment"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="task-description">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <textarea
                    id="task-description"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Task details..."
                    disabled={isPending}
                    rows={1}
                    className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="task-link">
                    Link{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="task-link"
                    type="url"
                    value={createLink}
                    onChange={(e) => setCreateLink(e.target.value)}
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
          <Plus className="size-4" />
          Add task
        </Button>
      )}

      {/* Task table */}
      <div className="border">
        <Table>
          <colgroup>
            <col className="w-[5rem]" />
            <col className="w-[16rem]" />
            <col />
            <col className="w-[16rem]" />
            <col className="w-14" />
          </colgroup>
          <TableHeader>
            <TableRow>
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
            {tasks.length === 0 && !showCreateForm ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No tasks yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const isEditing = editingTaskId === task.id;
                const isDeleting = deletingId === task.id;

                if (isEditing) {
                  return (
                    <TableRow key={task.id} className="bg-muted/40">
                      <TableCell className="px-4 align-top">
                        <Input
                          type="number"
                          min={1}
                          value={editOrder}
                          onChange={(e) => setEditOrder(e.target.value)}
                          disabled={isPending}
                          placeholder="—"
                          className="h-8 w-16"
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
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          disabled={isPending}
                          rows={1}
                          className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </TableCell>
                      <TableCell className="px-4 align-top">
                        <Input
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
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
                            onClick={cancelEdit}
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
                              beginEdit(task);
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
    </div>
  );
}
