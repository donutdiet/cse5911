"use client";

import { CalendarPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
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

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
};

export function AgendaManager({ agendas }: { agendas: Agenda[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createWeek, setCreateWeek] = useState("");

  const [editingAgendaId, setEditingAgendaId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWeek, setEditWeek] = useState("");

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateWeek("");
    setShowCreateForm(false);
  };

  const beginEdit = (agenda: Agenda) => {
    setActionError(null);
    setEditingAgendaId(agenda.id);
    setEditTitle(agenda.title);
    setEditDescription(agenda.description ?? "");
    setEditWeek(String(agenda.week));
  };

  const cancelEdit = () => {
    setEditingAgendaId(null);
    setEditTitle("");
    setEditDescription("");
    setEditWeek("");
  };

  const handleCreateAgenda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    const parsedWeek = Number.parseInt(createWeek, 10);
    if (!Number.isInteger(parsedWeek) || parsedWeek <= 0) {
      setActionError("Week must be a positive integer.");
      return;
    }

    startTransition(async () => {
      try {
        await createAgenda(
          createTitle.trim(),
          createDescription.trim() || null,
          parsedWeek,
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

    startTransition(async () => {
      try {
        await updateAgenda(
          agendaId,
          editTitle.trim(),
          editDescription.trim() || null,
          parsedWeek,
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
              <div className="grid items-start gap-4 sm:grid-cols-[5rem_16rem_1fr]">
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
                    placeholder="e.g. Review of Chapter 1, 2, and 3"
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
            <col className="w-[5rem]" />
            <col className="w-[16rem]" />
            <col />
            <col className="w-14" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Week</TableHead>
              <TableHead className="px-4">Title</TableHead>
              <TableHead className="px-4">Description</TableHead>
              <TableHead className="px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No agendas yet.
                </TableCell>
              </TableRow>
            ) : (
              agendas.map((agenda) => {
                const isEditing = editingAgendaId === agenda.id;
                const isDeleting = deletingId === agenda.id;

                if (isEditing) {
                  return (
                    <TableRow key={agenda.id} className="bg-muted/40">
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
                  );
                }

                return (
                  <TableRow
                    key={agenda.id}
                    className={cn(isDeleting && "opacity-50")}
                  >
                    <TableCell className="px-4">
                      <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                        {agenda.week}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {agenda.title}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      <span className="line-clamp-1">
                        {agenda.description || (
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
