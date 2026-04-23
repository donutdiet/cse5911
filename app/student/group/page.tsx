/*
  app/student/group/page.tsx

  Shows the student their assigned group. Fetches the group they belong to
  via the member_of table, then loads the other members from profile.

  Possible states:
    1. Independent study — informational card, link to profile
    2. Not in a group yet — friendly empty state
    3. In a group — meeting details card + members card
*/

import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Calendar, Clock, MapPin, Users, Video } from "lucide-react";

import AvatarLightbox from "@/components/student/avatar-lightbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type GroupMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture_url: string | null;
  bio: string | null;
};

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(":");
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function GroupPage() {
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

  if (profileError) {
    console.error("[student/group] profile fetch failed", {
      userId: user.id,
      error: profileError,
    });
  }

  if (profile?.study_mode === "independent") {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-base font-semibold">
                You&apos;re in Independent Study
              </h2>
              <p className="text-sm text-muted-foreground">
                You won&apos;t be assigned to a study group. If you want to join
                the grouping pool again, update your study mode from your
                profile.
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

  const { data: membership } = await supabase
    .from("member_of")
    .select("group_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <PageShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                You&apos;re not in a group yet
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Groups are created by your instructor after availability
                submissions close. Check back soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("group")
    .select(
      `
      id,
      preference,
      day_of_week,
      meet_start_time,
      meet_end_time,
      room_id,
      room_overbooked,
      room (
        building,
        room_number
      )
    `,
    )
    .eq("id", membership.group_id)
    .single();

  if (groupError) {
    console.error("[student/group] group fetch failed", {
      groupId: membership.group_id,
      userId: user.id,
      error: groupError,
    });
  }

  const { data: membersData, error: membersError } = await supabase.rpc(
    "get_my_group_members",
  );
  const members = (membersData ?? []) as GroupMember[];

  if (membersError) {
    console.error("[student/group] members fetch failed", {
      groupId: membership.group_id,
      userId: user.id,
      error: membersError,
    });
  }

  if (!group) {
    return (
      <PageShell>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              We couldn&apos;t load your group right now. Please try refreshing
              in a moment.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const meetingDay = DAY_NAMES[group.day_of_week ?? 0];
  const startTime = formatTime(group.meet_start_time);
  const endTime = formatTime(group.meet_end_time);
  const isOnline = group.preference === "online";
  const room = Array.isArray(group.room) ? group.room[0] : group.room;
  const roomLabel = room
    ? `${room.building} ${room.room_number}`
    : "To be announced";

  const orderedMembers = [...members].sort((a, b) => {
    if (a.user_id === user.id) return -1;
    if (b.user_id === user.id) return 1;
    return (a.full_name ?? "").localeCompare(b.full_name ?? "");
  });

  return (
    <PageShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meeting details</CardTitle>
            <CardDescription>
              Your weekly group meeting and how to find it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                icon={<Calendar className="h-4 w-4" />}
                label="Day"
                value={meetingDay ?? "—"}
              />
              <StatBlock
                icon={<Clock className="h-4 w-4" />}
                label="Time"
                value={`${startTime} – ${endTime}`}
              />
              <StatBlock
                icon={
                  isOnline ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )
                }
                label={isOnline ? "Format" : "Location"}
                value={isOnline ? "Online" : roomLabel}
              />
              <StatBlock
                icon={<Users className="h-4 w-4" />}
                label="Members"
                value={`${members.length} student${members.length === 1 ? "" : "s"}`}
              />
            </div>

            {!isOnline && group.room_overbooked ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                This meeting was created after room capacity was manually
                overridden.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group members</CardTitle>
            <CardDescription>
              Reach out anytime — you&apos;re studying together.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            {orderedMembers.length === 0 ? (
              <p className="px-6 pb-2 text-sm text-muted-foreground">
                No members found.
              </p>
            ) : (
              <ul className="divide-y">
                {orderedMembers.map((m) => {
                  const isYou = m.user_id === user.id;
                  const initials = getInitials(m.full_name);

                  return (
                    <li
                      key={m.user_id}
                      className="flex items-start gap-4 px-6 py-4"
                    >
                      <div className="shrink-0">
                        {m.profile_picture_url ? (
                          <AvatarLightbox
                            src={m.profile_picture_url}
                            alt={m.full_name ?? "Member"}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted">
                            <span className="text-xs font-medium text-muted-foreground">
                              {initials}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              !m.full_name && "text-muted-foreground",
                            )}
                          >
                            {m.full_name ?? "Unknown"}
                          </p>
                          {isYou ? (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                              You
                            </span>
                          ) : null}
                        </div>

                        {m.email || m.phone ? (
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {m.email ? (
                              <span className="truncate">{m.email}</span>
                            ) : null}
                            {m.phone ? <span>{m.phone}</span> : null}
                          </div>
                        ) : null}

                        {m.bio ? (
                          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                            {m.bio}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Your study group</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned group, meeting schedule, and who you&apos;re studying
          with.
        </p>
      </header>
      {children}
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
