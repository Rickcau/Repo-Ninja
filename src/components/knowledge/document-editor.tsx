"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeCategory } from "@/lib/types";

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "best-practices", label: "Best Practices" },
  { value: "scaffolding", label: "Scaffolding" },
  { value: "review-instructions", label: "Review Instructions" },
  { value: "agent-instructions", label: "Agent Instructions" },
  { value: "architecture-patterns", label: "Architecture Patterns" },
  { value: "ci-cd", label: "CI/CD" },
  { value: "responsible-ai", label: "Responsible AI" },
];

interface DocumentEditorProps {
  filename?: string;
  initialCategory?: KnowledgeCategory;
  initialContent?: string;
  isNew: boolean;
  onSave: (filename: string, category: KnowledgeCategory, content: string) => Promise<boolean>;
  onCancel: () => void;
}

export function DocumentEditor({
  filename: initialFilename,
  initialCategory,
  initialContent,
  isNew,
  onSave,
  onCancel,
}: DocumentEditorProps) {
  const [filename, setFilename] = useState(initialFilename || "");
  const [category, setCategory] = useState<KnowledgeCategory>(initialCategory || "best-practices");
  const [content, setContent] = useState(initialContent || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(filename, category, content);
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNew ? "Add Document" : `Edit: ${filename}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Filename</label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={!isNew}
              placeholder="my-best-practices.md"
            />
          </div>
          <div className="w-48">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as KnowledgeCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Content (Markdown)</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder={"# Title\n\nWrite your best practices here..."}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !filename || !content}>
            {saving ? "Saving & Indexing..." : "Save & Re-index"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
