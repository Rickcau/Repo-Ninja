"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

const STORAGE_KEY = "repo-ninja-notifications";

function serializeNotifications(notifications: Notification[]): string {
  return JSON.stringify(
    notifications.map((n) => ({
      ...n,
      timestamp: n.timestamp.toISOString(),
    }))
  );
}

function deserializeNotifications(raw: string): Notification[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((n: Record<string, unknown>) => ({
      ...n,
      timestamp: new Date(n.timestamp as string),
    })) as Notification[];
  } catch {
    return [];
  }
}

// TODO: Replace with real API data
function getSeedNotifications(): Notification[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);

  return [
    {
      id: "seed-1",
      type: "success",
      title: "Agent run completed",
      description:
        "Code review agent finished analyzing repo-ninja/frontend with 3 suggestions.",
      timestamp: new Date(today.getTime() + 10 * 3600000),
      read: false,
      actionUrl: "/reviews",
      actionLabel: "View results",
    },
    {
      id: "seed-2",
      type: "info",
      title: "Knowledge base updated",
      description:
        "2 new documents were indexed into ChromaDB from the best-practices collection.",
      timestamp: new Date(today.getTime() + 8 * 3600000),
      read: false,
    },
    {
      id: "seed-3",
      type: "warning",
      title: "API rate limit approaching",
      description:
        "GitHub API usage is at 85% of the hourly limit. Consider spacing out agent runs.",
      timestamp: new Date(yesterday.getTime() + 16 * 3600000),
      read: false,
      actionUrl: "/settings",
      actionLabel: "View settings",
    },
    {
      id: "seed-4",
      type: "error",
      title: "Scaffold generation failed",
      description:
        'Template "next-api-route" failed to generate due to missing configuration.',
      timestamp: new Date(yesterday.getTime() + 12 * 3600000),
      read: true,
      actionUrl: "/scaffold",
      actionLabel: "Retry",
    },
    {
      id: "seed-5",
      type: "success",
      title: "Repository connected",
      description:
        "Successfully linked octocat/hello-world to your Repo-Ninja workspace.",
      timestamp: new Date(twoDaysAgo.getTime() + 14 * 3600000),
      read: true,
    },
  ];
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeNotifications(stored);
      if (parsed.length > 0) {
        setNotifications(parsed);
      } else {
        setNotifications(getSeedNotifications());
      }
    } else {
      setNotifications(getSeedNotifications());
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, serializeNotifications(notifications));
    }
  }, [notifications, hydrated]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
