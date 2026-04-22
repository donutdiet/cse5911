import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  UserRound,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WelcomeSkeletons } from "@/components/layout/welcome-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const quickLinks = [
  {
    href: "/student/availability",
    label: "Availability",
    description: "Mark the times you're free so the matcher can find your crew.",
    icon: CalendarClock,
  },
  {
    href: "/student/agenda",
    label: "Agenda",
    description: "Check the weekly tasks your group will work through together.",
    icon: ClipboardList,
  },
  {
    href: "/student/group",
    label: "Group",
    description: "See who's on your team and how to reach them.",
    icon: Users,
  },
  {
    href: "/student/profile",
    label: "Profile",
    description: "Keep your name, contact info, and preferences up to date.",
    icon: UserRound,
  },
];

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let firstName: string | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profile")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    if (profile?.full_name) {
      firstName = profile.full_name.split(" ")[0] ?? null;
    }
  }

  const greeting = firstName ? `Welcome, ${firstName}!` : "Welcome!";

  return (
    <section className="w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="animate-fade-in-up flex flex-col items-center gap-8 text-center">
        <WelcomeSkeletons />
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Your study hub
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
            {greeting}
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Anatomy is better with a team. Share your availability, meet your
            group, and tackle each week&apos;s agenda together.
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, label, description, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="group focus:outline-none"
            style={{
              animation: `fade-in-up 0.5s ease-out ${0.15 + i * 0.08}s both`,
            }}
          >
            <Card className="relative h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-3 text-lg">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div
        className="mt-10 rounded-xl border bg-muted/30 px-5 py-4 text-sm text-muted-foreground"
        style={{ animation: "fade-in-up 0.5s ease-out 0.5s both" }}
      >
        <p>
          <span className="font-semibold text-foreground">First time here?</span>{" "}
          Start by setting your{" "}
          <Link
            href="/student/availability"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Availability
          </Link>
          {" "}and filling in your{" "}
          <Link
            href="/student/profile"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Profile
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
