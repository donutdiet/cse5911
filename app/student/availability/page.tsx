// app/student/availability/page.tsx
// Loads the student's existing availability from the DB,
// then passes it to the AvailabilityGrid component to render

import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";

import { AvailabilityGrid } from "@/components/student/availability-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("study_mode")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <PageShell>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Could not load your profile.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (profile.study_mode === "independent") {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-base font-semibold">
                Availability is not needed for Independent Study
              </h2>
              <p className="text-sm text-muted-foreground">
                Independent-study students aren&apos;t added to the grouping
                pool, so there&apos;s no weekly availability to collect.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/profile">Change study mode</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { data: timeSlots, error: slotsError } = await supabase
    .from("time_slot")
    .select("id, day, slot_index")
    .order("slot_index");

  if (slotsError || !timeSlots) {
    return (
      <PageShell>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Could not load time slots. Make sure the time_slot table is
              seeded.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { data: savedAvailability } = await supabase
    .from("availability")
    .select("time_slot_id")
    .eq("user_id", user.id);

  const savedSlotIds = savedAvailability?.map((row) => row.time_slot_id) ?? [];

  return (
    <PageShell>
      <AvailabilityGrid
        userId={user.id}
        timeSlots={timeSlots}
        savedSlotIds={savedSlotIds}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us when you&apos;re free so we can place you in a compatible
          group.
        </p>
      </header>
      {children}
    </div>
  );
}
