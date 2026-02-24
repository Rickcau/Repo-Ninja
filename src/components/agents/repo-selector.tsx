"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Repo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string | null;
}

interface RepoSelectorProps {
  onChange: (repo: { fullName: string; owner: string; name: string }) => void;
}

export function RepoSelector({ onChange }: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/repos");
        if (!res.ok) throw new Error("Failed to fetch repos");
        const data = await res.json();
        setRepos(data.repos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repos");
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

  const handleChange = (fullName: string) => {
    const repo = repos.find((r) => r.fullName === fullName);
    if (repo) {
      onChange({ fullName: repo.fullName, owner: repo.owner, name: repo.name });
    }
  };

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <Select onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className="w-72">
        <SelectValue placeholder={loading ? "Loading repos..." : "Select a repository"} />
      </SelectTrigger>
      <SelectContent>
        {repos.map((repo) => (
          <SelectItem key={repo.fullName} value={repo.fullName}>
            {repo.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
