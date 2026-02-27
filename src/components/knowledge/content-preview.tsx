"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, Database, Clock, Tag } from "lucide-react";

function getUsedBy(category: string): string[] {
  switch (category) {
    case "review-instructions": return ["Review"];
    case "scaffolding": return ["Scaffold"];
    case "best-practices": return ["Review", "Scaffold"];
    case "agent-instructions": return ["Review", "Scaffold"];
    case "ci-cd": return ["Scaffold"];
    case "responsible-ai": return ["Review", "Audit"];
    case "architecture-patterns": return ["Review", "Scaffold"];
    default: return [];
  }
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Indexed ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Indexed ${hours}h ago`;
  return `Indexed ${Math.floor(hours / 24)}d ago`;
}

interface ContentPreviewProps {
  filename: string;
  category: string;
  content: string;
  title?: string;
  tags?: string[];
  updatedAt?: string;
  onClose: () => void;
}

export function ContentPreview({
  filename,
  category,
  content,
  title,
  tags = [],
  updatedAt,
  onClose,
}: ContentPreviewProps) {
  const usedBy = getUsedBy(category);
  const [chunks, setChunks] = useState(0);

  useEffect(() => {
    fetch("/api/knowledge/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.documentCount != null) setChunks(Math.round(data.documentCount / 8));
      })
      .catch(() => {});
  }, []);

  const indexStatus = updatedAt ? formatRelativeTime(updatedAt) : "Not indexed";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{title || filename}</span>
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground truncate">{filename}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mt-1 -mr-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="capitalize">{category.replace("-", " ")}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span>{chunks} chunks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{indexStatus}</span>
          </div>
          {updatedAt && (
            <div className="flex items-center gap-1.5">
              <span>Updated: {new Date(updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {usedBy.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Used By</span>
            <div className="flex flex-wrap gap-1">
              {usedBy.map((agent) => (
                <Badge key={agent} variant="secondary" className="text-xs">{agent}</Badge>
              ))}
            </div>
          </div>
        )}
        {tags.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags
            </span>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (<Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>))}
            </div>
          </div>
        )}
        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1.5">Content</span>
          <div className="bg-muted/50 rounded-md border p-3 max-h-[400px] overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
              {content || "No content available."}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
