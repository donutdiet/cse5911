import Link from "next/link";
import {
  Calendar,
  LayoutGrid,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { WelcomeSkeletons } from "@/components/layout/welcome-skeletons";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const quickLinks = [
  {
    href: "/admin/roster",
    label: "Roster",
    icon: Users,
    accent: "from-primary/10 to-primary/5",
  },
  {
    href: "/admin/groups",
    label: "Groups",
    icon: LayoutGrid,
    accent: "from-primary/15 to-primary/5",
  },
  {
    href: "/admin/agendas",
    label: "Agendas",
    icon: Calendar,
    accent: "from-primary/10 to-primary/5",
  },
  {
    href: "/admin/progress",
    label: "Progress",
    icon: BarChart3,
    accent: "from-primary/15 to-primary/5",
  },
];

export default function AdminPage() {
  return (
    <section className="w-full max-w-6xl px-4 sm:px-6">
      <div className="animate-fade-in-up flex flex-col items-center gap-8 text-center">
        <WelcomeSkeletons />
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Instructor dashboard
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
            Welcome back!
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Manage your anatomy class end to end: manage students, form balanced
            groups, and publish the weekly agenda. Pick a section below to jump in.
          </p>
        </div>
      </div>

      <div
        className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        style={{ animation: "fade-in-up 0.6s ease-out 0.1s both" }}
      >
        {quickLinks.map(({ href, label, icon: Icon, accent }, i) => (
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
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
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
            </Card>
          </Link>
        ))}
      </div>

      <div
        className="mt-10 rounded-xl border bg-muted/30 px-5 py-4 text-sm text-muted-foreground"
        style={{ animation: "fade-in-up 0.5s ease-out 0.4s both" }}
      >
        <p>
          <span className="font-semibold text-foreground">New here?</span> Head
          to{" "}
          <Link
            href="/admin/roster"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Roster
          </Link>
          {" "}to confirm every student is registered, then go to{" "}
          <Link
            href="/admin/groups"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Groups
          </Link>
          {" "}to form the groups.
        </p>
      </div>
    </section>
  );
}
