"use client";

import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export function NavBar({ user }: { user: User | null }) {
  const isSignedIn = user !== null;
  const pathname = usePathname();
  const tabs = isSignedIn
    ? [
        { href: "/group", label: "Group" },
        { href: "/availability", label: "Availability" },
        { href: "/profile", label: "My Profile" },
      ]
    : [
        { href: "/login", label: "Login" },
        { href: "/signup", label: "Sign Up" },
      ];

  return (
    <header className="sticky top-0 z-50 p-2">
      <div className="w-full px-8 py-4 items-center justify-between flex flex-row">
        <Link href="/" className="flex items-center gap-5">
          <h1 className="text-2xl font-bold text-primary">
            Anatomy Study Groups
          </h1>
        </Link>

        <nav className="flex flex-wrap items-center gap-4">
          {tabs.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Button
                asChild
                key={link.href}
                variant={isActive ? "secondary" : "ghost"}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}

          {isSignedIn && <LogoutButton />}
        </nav>
      </div>
    </header>
  );
}
