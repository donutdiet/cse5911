"use client";

// components/student/availability-grid.tsx
// Interactive weekly availability grid - works like When2Meet
// Clicking a cell toggles it and immediately saves to the DB
// Selected (red) = available, unselected = not available

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 7am - 11pm, one label per hour
const TIME_LABELS = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

// Shape of a time_slot row from the DB
type TimeSlot = {
  id: number;
  day: number;
  slot_index: number;
};

type Props = {
  userId: string;
  // all 112 time_slot rows from the DB
  timeSlots: TimeSlot[];
  // the slot IDs the student has already saved
  savedSlotIds: number[];
};

export function AvailabilityGrid({ userId, timeSlots, savedSlotIds }: Props) {
  const supabase = createClient();

  // track which slots are selected - starts from whatever's saved in DB
  const [selected, setSelected] = useState<Set<number>>(
    new Set(savedSlotIds)
  );

  // useTransition lets us show a pending state without blocking the UI
  const [isPending, startTransition] = useTransition();

  // build a lookup so we can find a slot by (day, slotPosition) quickly
  // key = "day-slotPosition", value = slot id
  const slotLookup: Record<string, number> = {};
  timeSlots.forEach((slot) => {
    const positionInDay = slot.slot_index - slot.day * 16;
    slotLookup[`${slot.day}-${positionInDay}`] = slot.id;
  });

  const handleCellClick = (day: number, slotPosition: number) => {
    const slotId = slotLookup[`${day}-${slotPosition}`];
    if (!slotId) return;

    const isCurrentlySelected = selected.has(slotId);

    // optimistic update - toggle immediately so UI feels instant
    setSelected((prev) => {
      const next = new Set(prev);
      isCurrentlySelected ? next.delete(slotId) : next.add(slotId);
      return next;
    });

    // then sync with the DB in the background
    startTransition(async () => {
      if (isCurrentlySelected) {
        await supabase
          .from("availability")
          .delete()
          .eq("user_id", userId)
          .eq("time_slot_id", slotId);
      } else {
        await supabase
          .from("availability")
          .insert({ user_id: userId, time_slot_id: slotId });
      }
    });
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* subtle indicator so the student knows changes are saving */}
      <p className={cn(
        "mb-3 text-xs text-muted-foreground transition-opacity",
        isPending ? "opacity-100" : "opacity-0"
      )}>
        Saving...
      </p>

      <div className="min-w-[600px]">
        {/* day header row */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] mb-1">
          <div /> {/* empty corner */}
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground pb-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* time rows */}
        {TIME_LABELS.map((label, slotPosition) => (
          <div
            key={slotPosition}
            className="grid grid-cols-[64px_repeat(7,1fr)]"
          >
            {/* time label on the left */}
            <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
              {label}
            </div>

            {/* one cell per day */}
            {DAYS.map((_, day) => {
              const slotId = slotLookup[`${day}-${slotPosition}`];
              const isSelected = selected.has(slotId);

              return (
                <button
                  key={day}
                  onClick={() => handleCellClick(day, slotPosition)}
                  className={cn(
                    "h-8 border border-border transition-colors",
                    // round the corners on the outer edges of the grid
                    slotPosition === 0 && day === 0 && "rounded-tl-md",
                    slotPosition === 0 && day === 6 && "rounded-tr-md",
                    slotPosition === TIME_LABELS.length - 1 && day === 0 && "rounded-bl-md",
                    slotPosition === TIME_LABELS.length - 1 && day === 6 && "rounded-br-md",
                    isSelected
                      ? "bg-primary hover:bg-primary/80"
                      : "bg-card hover:bg-accent"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Click a cell to mark yourself available. Changes save automatically.
      </p>
    </div>
  );
}