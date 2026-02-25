import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
}

export function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-md text-sm transition-colors",
        collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}
