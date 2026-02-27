// app/student/availability/page.tsx
// Loads the student's existing availability from the DB,
// then passes it to the AvailabilityGrid component to render

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AvailabilityGrid } from "@/components/student/availability-grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  // make sure the user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // load all 112 time slots - needed to build the grid
  const { data: timeSlots, error: slotsError } = await supabase
    .from("time_slot")
    .select("id, day, slot_index")
    .order("slot_index");

  if (slotsError || !timeSlots) {
    // time_slot table might not be seeded yet
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">
          Could not load time slots. Make sure the time_slot table is seeded.
        </p>
      </div>
    );
  }

  // load this student's saved availability
  const { data: savedAvailability } = await supabase
    .from("availability")
    .select("time_slot_id")
    .eq("user_id", user.id);

  const savedSlotIds = savedAvailability?.map((row) => row.time_slot_id) ?? [];

  return (
    <div className="w-full max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Availability</CardTitle>
          <CardDescription>
            Select the times you&apos;re free each week. We&apos;ll use this to match
            you with a study group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityGrid
            userId={user.id}
            timeSlots={timeSlots}
            savedSlotIds={savedSlotIds}
          />
        </CardContent>
      </Card>
    </div>
  );
}