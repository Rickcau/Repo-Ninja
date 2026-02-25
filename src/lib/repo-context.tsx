"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
}

interface RepoContextValue {
  selectedRepo: RepoInfo | null;
  recentRepos: RepoInfo[];
  pinnedRepos: RepoInfo[];
  setSelectedRepo: (repo: RepoInfo | null) => void;
  pinRepo: (repo: RepoInfo) => void;
  unpinRepo: (fullName: string) => void;
}

const STORAGE_KEY_SELECTED = "repo-ninja:selected-repo";
const STORAGE_KEY_RECENT = "repo-ninja:recent-repos";
const STORAGE_KEY_PINNED = "repo-ninja:pinned-repos";
const MAX_RECENT = 5;

const RepoContext = createContext<RepoContextValue | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function RepoContextProvider({ children }: { children: ReactNode }) {
  const [selectedRepo, setSelectedRepoState] = useState<RepoInfo | null>(null);
  const [recentRepos, setRecentRepos] = useState<RepoInfo[]>([]);
  const [pinnedRepos, setPinnedRepos] = useState<RepoInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSelectedRepoState(loadFromStorage<RepoInfo | null>(STORAGE_KEY_SELECTED, null));
    setRecentRepos(loadFromStorage<RepoInfo[]>(STORAGE_KEY_RECENT, []));
    setPinnedRepos(loadFromStorage<RepoInfo[]>(STORAGE_KEY_PINNED, []));
    setHydrated(true);
  }, []);

  const setSelectedRepo = useCallback(
    (repo: RepoInfo | null) => {
      setSelectedRepoState(repo);
      saveToStorage(STORAGE_KEY_SELECTED, repo);

      if (repo) {
        setRecentRepos((prev) => {
          const filtered = prev.filter((r) => r.fullName !== repo.fullName);
          const next = [repo, ...filtered].slice(0, MAX_RECENT);
          saveToStorage(STORAGE_KEY_RECENT, next);
          return next;
        });
      }
    },
    []
  );

  const pinRepo = useCallback((repo: RepoInfo) => {
    setPinnedRepos((prev) => {
      if (prev.some((r) => r.fullName === repo.fullName)) return prev;
      const next = [...prev, repo];
      saveToStorage(STORAGE_KEY_PINNED, next);
      return next;
    });
  }, []);

  const unpinRepo = useCallback((fullName: string) => {
    setPinnedRepos((prev) => {
      const next = prev.filter((r) => r.fullName !== fullName);
      saveToStorage(STORAGE_KEY_PINNED, next);
      return next;
    });
  }, []);

  // Avoid hydration mismatch by rendering children only after hydration
  if (!hydrated) {
    return <RepoContext.Provider value={{
      selectedRepo: null,
      recentRepos: [],
      pinnedRepos: [],
      setSelectedRepo,
      pinRepo,
      unpinRepo,
    }}>{children}</RepoContext.Provider>;
  }

  return (
    <RepoContext.Provider
      value={{
        selectedRepo,
        recentRepos,
        pinnedRepos,
        setSelectedRepo,
        pinRepo,
        unpinRepo,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepoContext(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) {
    throw new Error("useRepoContext must be used within a RepoContextProvider");
  }
  return ctx;
}
