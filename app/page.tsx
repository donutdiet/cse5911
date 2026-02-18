import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { AppBrand } from "@/components/layout/app-brand";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="w-full h-16 flex items-center justify-between">
        <AppBrand />
        <Suspense>
          <AuthButton />
        </Suspense>
      </nav>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 pb-20 pt-10">
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
    </main>
  );
}
