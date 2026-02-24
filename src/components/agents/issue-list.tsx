"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
}

interface IssueListProps {
  owner: string;
  repo: string;
  onAssign: (issue: Issue) => void;
  assigningIssue: number | null;
}

export function IssueList({ owner, repo, onAssign, assigningIssue }: IssueListProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/repos/${owner}/${repo}/issues`);
        if (!res.ok) throw new Error("Failed to fetch issues");
        const data = await res.json();
        setIssues(data.issues || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setLoading(false);
      }
    }
    if (owner && repo) {
      fetchIssues();
    }
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading issues...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-4">{error}</p>;
  }

  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No open issues found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Labels</TableHead>
          <TableHead className="w-40">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map((issue) => (
          <TableRow key={issue.number}>
            <TableCell className="font-mono text-sm">{issue.number}</TableCell>
            <TableCell>{issue.title}</TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {issue.labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => onAssign(issue)}
                disabled={assigningIssue === issue.number}
              >
                {assigningIssue === issue.number ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Assigning...
                  </>
                ) : (
                  "Assign to Agent"
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
