"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, Database, Clock, Tag } from "lucide-react";

// TODO: Replace with real API data
const MOCK_USED_BY: Record<string, string[]> = {
  "best-practices-typescript.md": ["Review", "Scaffold"],
  "nextjs-scaffolding-template.md": ["Scaffold"],
  "security-review-checklist.md": ["Review"],
  "docker-deployment-guide.md": ["Scaffold", "Audit"],
  "responsible-ai-guidelines.md": ["Review", "Audit"],
  "ci-cd-github-actions.md": ["Scaffold"],
  "architecture-patterns-microservices.md": ["Review", "Scaffold"],
  "agent-instructions-code-review.md": ["Review"],
};

const MOCK_CHUNKS: Record<string, number> = {
  "best-practices-typescript.md": 12,
  "nextjs-scaffolding-template.md": 8,
  "security-review-checklist.md": 15,
  "docker-deployment-guide.md": 6,
  "responsible-ai-guidelines.md": 10,
  "ci-cd-github-actions.md": 5,
  "architecture-patterns-microservices.md": 18,
  "agent-instructions-code-review.md": 9,
};

// TODO: Replace with real API data
const MOCK_INDEX_STATUS: Record<string, string> = {
  "best-practices-typescript.md": "Indexed 2h ago",
  "nextjs-scaffolding-template.md": "Indexed 2h ago",
  "security-review-checklist.md": "Indexed 1h ago",
  "docker-deployment-guide.md": "Indexed 3h ago",
  "responsible-ai-guidelines.md": "Indexed 2h ago",
  "ci-cd-github-actions.md": "Indexed 4h ago",
  "architecture-patterns-microservices.md": "Indexed 2h ago",
  "agent-instructions-code-review.md": "Indexed 1h ago",
};

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
  // TODO: Replace with real API data
  const usedBy = MOCK_USED_BY[filename] || [];
  const chunks = MOCK_CHUNKS[filename] || 0;
  const indexStatus = MOCK_INDEX_STATUS[filename] || "Not indexed";

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
        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="capitalize">
              {category.replace("-", " ")}
            </Badge>
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

        {/* Used by agents */}
        {usedBy.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Used By</span>
            <div className="flex flex-wrap gap-1">
              {usedBy.map((agent) => (
                <Badge key={agent} variant="secondary" className="text-xs">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Tags
            </span>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content preview */}
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
