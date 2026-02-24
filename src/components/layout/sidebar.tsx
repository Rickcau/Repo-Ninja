"use client";

import { usePathname } from "next/navigation";
import { NavItem } from "./nav-item";
import { LayoutDashboard, Hammer, Bot, FileSearch, BookOpen } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scaffold", label: "Scaffold", icon: Hammer },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/reviews", label: "Reviews", icon: FileSearch },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  );
}
