import { AuthButton } from "@/components/auth/auth-button";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 px-6 flex items-center justify-between">
        <span className="font-semibold text-lg">AnatWtihMe</span>
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
