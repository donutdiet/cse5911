"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, LayoutGrid, Calendar } from "lucide-react";

const tabs = [
  { label: "Roster", href: "/admin/roster", icon: Users },
  { label: "Groups", href: "/admin/groups", icon: LayoutGrid },
  { label: "Agendas", href: "/admin/agendas", icon: Calendar },
];

export function AdminNavbar() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-foreground hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
