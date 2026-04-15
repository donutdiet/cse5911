import { AuthButton } from "@/components/auth/auth-button";
import { StudentNavbar } from "@/components/student/student-navbar";
import { AppBrand } from "@/components/layout/app-brand";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  let isAdmin = false;
  if (user?.sub) {
    const { data: profile } = await supabase
      .from("profile")
      .select("role")
      .eq("user_id", user.sub)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 flex items-center">
        <AppBrand />
        <div className="ml-auto flex items-center gap-4">
          <StudentNavbar isAdmin={isAdmin} />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </main>
  );
}
