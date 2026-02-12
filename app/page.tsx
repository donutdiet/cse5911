import { AuthButton } from "@/components/auth/auth-button";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 px-6 flex items-center justify-between">
        <Link href="/">
          <span className="font-semibold text-lg">AnatWithMe</span>
        </Link>
        <Suspense>
          <AuthButton />
        </Suspense>
      </nav>

      <div className="flex-1 flex items-center justify-center">
        <div>Anatomy Study Groups Landing Page</div>
      </div>
    </main>
  );
}
