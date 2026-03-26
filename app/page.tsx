import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { AppBrand } from "@/components/layout/app-brand";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="w-full h-16 flex items-center justify-between">
        <AppBrand />
        <Suspense>
          <AuthButton />
        </Suspense>
      </nav>

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 pb-20 pt-10">
        <div className="max-w-3xl space-y-5">
          <h1 className="text-balance text-4xl font-bold leading-tight">
            Anatomy class study groups, all in one place.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            AnatWithMe supports all aspects of group-based learning for your
            anatomy course. Create semester-long study groups based on
            availability and preferences, and work together weekly to complete
            assignments and review course material.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 py-4 text-xs leading-5 text-muted-foreground sm:text-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <p>
              <span className="font-semibold text-foreground">AnatWithMe</span>{" "}
              <span className="mx-1 hidden md:inline">|</span>
              Study group coordination for anatomy courses.
            </p>
            <p>&copy; {new Date().getFullYear()} AnatWithMe</p>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            {/* TODO: Add contact info + document links */}
            <p>Support: course staff or department contact</p>
            <p className="flex flex-wrap items-center gap-x-2">
              <span>Privacy</span>
              <span aria-hidden="true">|</span>
              <span>Accessibility</span>
              <span aria-hidden="true">|</span>
              <span>Terms</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
