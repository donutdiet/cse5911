"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarClock, Users, UserRound, Menu } from "lucide-react";

const tabs = [
  { label: "Availability", href: "/student/availability", icon: CalendarClock },
  { label: "Group", href: "/student/group", icon: Users },
  { label: "Profile", href: "/student/profile", icon: UserRound },
];

export function StudentNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="hidden md:flex items-center gap-1">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-md px-3 py-2 border"
        >
          <Menu className="size-5" />
          Menu
        </button>
        {open && (
          <div className="absolute mt-2 w-48 rounded-md border bg-background shadow-lg z-50">
            {tabs.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm",
                    isActive
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
