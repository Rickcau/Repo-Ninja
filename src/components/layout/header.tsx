"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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

  const pageTitle = pageTitles[pathname] || "Repo-Ninja";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center px-6 gap-4">
      <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
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
