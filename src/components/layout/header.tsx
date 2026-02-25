"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { RepoSelectorGlobal } from "@/components/shared/repo-selector-global";
import { NotificationDrawer } from "@/components/shared/notification-drawer";
import { useNotifications } from "@/lib/notifications-context";
import { Settings, LogOut, LogIn, Bell, Clock } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/scaffold": "Scaffold",
  "/agents": "Agents",
  "/reviews": "Reviews",
  "/knowledge": "Knowledge Base",
  "/settings": "Settings",
};

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const pageTitle = pageTitles[pathname] || "Repo-Ninja";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center px-6 gap-4">
      <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
      {session && <RepoSelectorGlobal />}
      <div className="flex-1" />
      {session ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="History"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-critical text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
          <ThemeToggle />
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <ThemeToggle />
          <Button onClick={() => signIn("github")}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </Button>
        </>
      )}
    </header>
  );
}
