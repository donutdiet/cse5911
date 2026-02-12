import { AuthButton } from "@/components/auth/auth-button";
import { StudentNavbar } from "@/components/student/student-navbar";
import Link from "next/link";
import { Suspense } from "react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 px-6 flex items-center">
        <Link href="/student">
          <span className="font-semibold text-lg">AnatWithMe</span>
        </Link>{" "}
        <div className="ml-auto flex items-center gap-4">
          <StudentNavbar />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </main>
  );
}
