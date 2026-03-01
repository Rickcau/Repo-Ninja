"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  ChevronDown,
  Pin,
  PinOff,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useRepoContext, type RepoInfo } from "@/lib/repo-context";
import { cn } from "@/lib/utils";

interface ApiRepo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export function RepoSelectorGlobal() {
  const { data: session } = useSession();
  const {
    selectedRepo,
    recentRepos,
    pinnedRepos,
    setSelectedRepo,
    pinRepo,
    unpinRepo,
  } = useRepoContext();

  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<ApiRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRepos = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos ?? []);
      }
    } catch {
      // silently fail — user can retry by reopening
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [fetched, loading]);

  // Fetch repos when popover opens
  useEffect(() => {
    if (open && !fetched) {
      fetchRepos();
    }
  }, [open, fetched, fetchRepos]);

  const handleSelect = (repo: ApiRepo) => {
    setSelectedRepo({
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
    });
    setOpen(false);
  };

  const isPinned = (fullName: string) =>
    pinnedRepos.some((r) => r.fullName === fullName);

  const togglePin = (e: React.MouseEvent, repo: RepoInfo) => {
    e.stopPropagation();
    if (isPinned(repo.fullName)) {
      unpinRepo(repo.fullName);
    } else {
      pinRepo(repo);
    }
  };

  if (!session) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 gap-2 px-3 text-sm font-medium",
            "border border-border rounded-md",
            "text-muted-foreground hover:text-foreground",
            "max-w-[360px]"
          )}
        >
          <GitBranch className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedRepo ? selectedRepo.fullName : "Select Repository"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <CommandEmpty>No repositories found.</CommandEmpty>

            {/* Pinned repos */}
            {pinnedRepos.length > 0 && (
              <CommandGroup heading="Pinned">
                {pinnedRepos.map((repo) => (
                  <CommandItem
                    key={`pinned-${repo.fullName}`}
                    value={repo.fullName}
                    onSelect={() =>
                      handleSelect({
                        fullName: repo.fullName,
                        name: repo.name,
                        owner: repo.owner,
                        private: false,
                        defaultBranch: "",
                        updatedAt: "",
                      })
                    }
                    className="justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">{repo.fullName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => togglePin(e, repo)}
                      className="shrink-0 p-0.5 rounded hover:bg-surface-raised"
                      aria-label={`Unpin ${repo.fullName}`}
                    >
                      <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Recent repos */}
            {recentRepos.length > 0 && (
              <>
                {pinnedRepos.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Recent">
                  {recentRepos
                    .filter((r) => !isPinned(r.fullName))
                    .map((repo) => (
                      <CommandItem
                        key={`recent-${repo.fullName}`}
                        value={`recent-${repo.fullName}`}
                        onSelect={() =>
                          handleSelect({
                            fullName: repo.fullName,
                            name: repo.name,
                            owner: repo.owner,
                            private: false,
                            defaultBranch: "",
                            updatedAt: "",
                          })
                        }
                        className="justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GitBranch className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{repo.fullName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => togglePin(e, repo)}
                          className="shrink-0 p-0.5 rounded hover:bg-surface-raised"
                          aria-label={`Pin ${repo.fullName}`}
                        >
                          <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}

            {/* All repos from API */}
            {repos.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="All Repositories">
                  {repos.map((repo) => (
                    <CommandItem
                      key={`all-${repo.fullName}`}
                      value={repo.fullName}
                      onSelect={() => handleSelect(repo)}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{repo.fullName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) =>
                          togglePin(e, {
                            owner: repo.owner,
                            name: repo.name,
                            fullName: repo.fullName,
                          })
                        }
                        className="shrink-0 p-0.5 rounded hover:bg-surface-raised"
                        aria-label={
                          isPinned(repo.fullName)
                            ? `Unpin ${repo.fullName}`
                            : `Pin ${repo.fullName}`
                        }
                      >
                        {isPinned(repo.fullName) ? (
                          <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Footer link */}
          <div className="border-t border-border p-1">
            <Link
              href="/repos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              All Repositories
            </Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
