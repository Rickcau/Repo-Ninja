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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scaffold", label: "Scaffold", icon: Hammer },
  { href: "/agents", label: "Agents", icon: Bot },
];

const featureItems = [
  { href: "/reviews", label: "Reviews", icon: FileSearch },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
];

const allNavItems = [...menuItems, ...featureItems];

function SidebarNav({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* MENU section */}
      <div>
        {!collapsed && (
          <p className="px-3 mb-1 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Menu
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {menuItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>

      {/* FEATURES section */}
      <div>
        {!collapsed && (
          <p className="px-3 mb-1 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Features
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {featureItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>
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
