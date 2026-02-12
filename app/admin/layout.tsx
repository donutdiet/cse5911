import { AuthButton } from "@/components/auth/auth-button";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { Suspense } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 px-6 flex items-center">
        <Link href="/admin">
          <span className="font-semibold text-lg">AnatWithMe</span>
        </Link>{" "}
        <div className="ml-auto flex items-center gap-4">
          <AdminNavbar />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </main>
  );
}
