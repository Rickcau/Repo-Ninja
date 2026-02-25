"use client";

import React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  BellOff,
  CheckCheck,
} from "lucide-react";
import {
  useNotifications,
  type Notification,
  type NotificationType,
} from "@/lib/notifications-context";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; className: string }
> = {
  success: {
    icon: CheckCircle,
    className: "text-status-success",
  },
  error: {
    icon: XCircle,
    className: "text-status-critical",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-status-warning",
  },
  info: {
    icon: Info,
    className: "text-status-info",
  },
};

function groupByDate(
  notifications: Notification[]
): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of notifications) {
    const nDate = new Date(
      n.timestamp.getFullYear(),
      n.timestamp.getMonth(),
      n.timestamp.getDate()
    );
    if (nDate.getTime() >= today.getTime()) {
      groups["Today"].push(n);
    } else if (nDate.getTime() >= yesterday.getTime()) {
      groups["Yesterday"].push(n);
    } else {
      groups["Earlier"].push(n);
    }
  }

  return ["Today", "Yesterday", "Earlier"]
    .filter((label) => groups[label].length > 0)
    .map((label) => ({
      label,
      items: groups[label].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    }));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors ${
        notification.read
          ? "opacity-60"
          : "bg-surface-raised/50"
      }`}
      role="article"
      aria-label={notification.title}
    >
      <div className="shrink-0 mt-0.5">
        <Icon className={`h-4 w-4 ${config.className}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-tight ${
              notification.read
                ? "text-muted-foreground"
                : "text-foreground font-medium"
            }`}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-status-active" />
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-xs text-muted-foreground/70">
            {formatTime(notification.timestamp)}
          </span>
          {notification.actionUrl && notification.actionLabel && (
            <Link
              href={notification.actionUrl}
              className="text-xs text-primary hover:underline"
              onClick={() => onMarkRead(notification.id)}
            >
              {notification.actionLabel}
            </Link>
          )}
          {!notification.read && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => onMarkRead(notification.id)}
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationDrawer({
  open,
  onOpenChange,
}: NotificationDrawerProps) {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications();

  const grouped = groupByDate(notifications);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <SheetDescription className="sr-only">
            Your recent notifications
          </SheetDescription>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={clearAll}
              >
                Clear all
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BellOff className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-1">You are all caught up.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markRead}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
