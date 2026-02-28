"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { NavItem } from "./nav-item";
import {
  LayoutDashboard,
  Hammer,
  Bot,
  FileSearch,
  BookOpen,
  ChevronsLeft,
  Search,
  Menu,
  Settings,
  History,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItemDef {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number | null;
}

const overviewItems: NavItemDef[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
];

const actionItems: NavItemDef[] = [
  { href: "/scaffold", label: "Scaffold", icon: Hammer },
  { href: "/agents", label: "Agents", icon: Bot, badge: 0 },
  { href: "/reviews", label: "Reviews", icon: FileSearch, badge: 0 },
];

const configureItems: NavItemDef[] = [
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/history", label: "Activity", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/test-copilot", label: "SDK Test", icon: FlaskConical },
];

const navGroups = [
  { label: "Overview", items: overviewItems },
  { label: "Actions", items: actionItems },
  { label: "Configure", items: configureItems },
];

const allNavItems = [
  ...overviewItems,
  ...actionItems,
  ...configureItems,
];

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="secondary"
      className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
    >
      {count}
    </Badge>
  );
}

function SidebarNav({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              {group.label}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <div key={item.href} className="relative flex items-center">
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.href}
                  collapsed={collapsed}
                />
                {!collapsed &&
                  item.badge != null &&
                  item.badge > 0 && (
                    <div className="absolute right-2">
                      <NavBadge count={item.badge} />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col sticky top-0 h-screen z-40",
          "bg-surface-sidebar border-r border-sidebar-border",
          "transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo row */}
        <div
          className={cn(
            "flex items-center h-14 px-3 gap-3",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
            N
          </div>
          {!collapsed && (
            <span className="font-bold text-sm text-foreground">
              Repo-Ninja
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
              !collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft
              className={cn(
                "h-4 w-4 transition-transform duration-250",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Search (expanded only) */}
        {!collapsed && (
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2 h-8 rounded-md border border-sidebar-border bg-surface-input px-2 text-sm text-muted-foreground">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Search...</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2">
          <SidebarNav collapsed={collapsed} pathname={pathname} />
        </nav>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 bg-surface-sidebar">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex items-center h-14 px-3 gap-3 border-b border-sidebar-border">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                N
              </div>
              <span className="font-bold text-sm text-foreground">
                Repo-Ninja
              </span>
            </div>
            <nav className="px-2 pt-3">
              <SidebarNav collapsed={false} pathname={pathname} />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
