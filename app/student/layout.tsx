import { AuthButton } from "@/components/auth/auth-button";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 px-6 flex items-center justify-between">
        <span className="font-semibold text-lg">Anatomy Study Groups</span>
        <Suspense>
          <AuthButton />
        </Suspense>
      </nav>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </main>
  );
}
