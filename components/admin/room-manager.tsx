"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createRoom,
  deleteRoom,
  updateRoom,
} from "@/lib/actions/room-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const DAY_LABELS = [
  { value: 0, short: "Mon", long: "Monday" },
  { value: 1, short: "Tue", long: "Tuesday" },
  { value: 2, short: "Wed", long: "Wednesday" },
  { value: 3, short: "Thu", long: "Thursday" },
  { value: 4, short: "Fri", long: "Friday" },
] as const;

const DEFAULT_GROUP_CAPACITY = 4;

type RoomDay = {
  id: number;
  day: number;
};

type Room = {
  id: number;
  building: string;
  room_number: string;
  group_capacity: number | null;
  room_day: RoomDay[];
};

type RoomFormState = {
  building: string;
  roomNumber: string;
  groupCapacity: string;
  days: number[];
};

function getDefaultFormState(): RoomFormState {
  return {
    building: "",
    roomNumber: "",
    groupCapacity: String(DEFAULT_GROUP_CAPACITY),
    days: [0, 1, 2, 3, 4],
  };
}

function getAvailableDays(room: Room) {
  return [...room.room_day]
    .map((entry) => entry.day)
    .filter((day) => day >= 0 && day <= 4)
    .sort((left, right) => left - right);
}

export function RoomManager({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RoomFormState>(() => getDefaultFormState());
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

  const isEditing = editingRoomId !== null;
  const submitLabel = isEditing ? "Save room" : "Add room";
  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((left, right) => {
        const buildingCompare = left.building.localeCompare(right.building);
        if (buildingCompare !== 0) {
          return buildingCompare;
        }

        return left.room_number.localeCompare(right.room_number);
      }),
    [rooms],
  );

  function resetForm() {
    setForm(getDefaultFormState());
    setEditingRoomId(null);
  }

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((value) => value !== day)
        : [...current.days, day].sort((left, right) => left - right),
    }));
  }

  function beginEdit(room: Room) {
    setError(null);
    setSuccessMessage(null);
    setEditingRoomId(room.id);
    setForm({
      building: room.building,
      roomNumber: room.room_number,
      groupCapacity: String(room.group_capacity ?? DEFAULT_GROUP_CAPACITY),
      days: getAvailableDays(room),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const payload = {
        building: form.building,
        roomNumber: form.roomNumber,
        groupCapacity: Number.parseInt(form.groupCapacity, 10),
        days: form.days,
      };

      const result =
        editingRoomId === null
          ? await createRoom(payload)
          : await updateRoom(editingRoomId, payload);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        editingRoomId === null ? "Room created." : "Room updated.",
      );
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(roomId: number) {
    const confirmed = window.confirm(
      "Delete this room? Existing day availability rows will also be removed.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingRoomId(roomId);
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await deleteRoom(roomId);
      if ("error" in result) {
        setError(result.error);
        setDeletingRoomId(null);
        return;
      }

      setSuccessMessage("Room deleted.");
      if (editingRoomId === roomId) {
        resetForm();
      }
      setDeletingRoomId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {successMessage}
        </div>
      )}

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit room" : "Add room"}</CardTitle>
          <CardDescription>
            Set the room label, how many in-person groups it can hold per hour,
            and which weekdays it is available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="room-building">Building</Label>
                <Input
                  id="room-building"
                  value={form.building}
                  disabled={isPending}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      building: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="room-number">Room number</Label>
                <Input
                  id="room-number"
                  value={form.roomNumber}
                  disabled={isPending}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roomNumber: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="room-capacity">Group capacity</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min={1}
                  value={form.groupCapacity}
                  disabled={isPending}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      groupCapacity: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Available days</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((day) => {
                  const active = form.days.includes(day.value);
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      disabled={isPending}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.long}
                    </Button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                Rooms without a selected day will not be eligible for matching on
                that day.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {editingRoomId === null ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                {isPending ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/100">
              <TableHead className="px-4">Building</TableHead>
              <TableHead className="px-4">Room</TableHead>
              <TableHead className="px-4">Capacity</TableHead>
              <TableHead className="px-4">Available</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRooms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No rooms configured yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedRooms.map((room) => {
                const availableDays = getAvailableDays(room);

                return (
                  <TableRow key={room.id}>
                    <TableCell className="px-4 font-medium">
                      {room.building}
                    </TableCell>
                    <TableCell className="px-4">{room.room_number}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {room.group_capacity ?? DEFAULT_GROUP_CAPACITY}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {DAY_LABELS.map((day) => {
                          const active = availableDays.includes(day.value);

                          return (
                            <span
                              key={day.value}
                              className={cn(
                                "inline-flex rounded-md border px-2 py-0.5 text-xs",
                                active
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {day.short}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => beginEdit(room)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isPending || deletingRoomId === room.id}
                          onClick={() => handleDelete(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingRoomId === room.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
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
