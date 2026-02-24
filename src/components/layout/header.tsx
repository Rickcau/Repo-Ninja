"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="font-bold text-lg">
          Repo-Ninja
        </Link>
        <div className="flex-1" />
        {session ? (
          <>
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button onClick={() => signIn("github")}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </Button>
        )}
      </div>
    </header>
  );
}
