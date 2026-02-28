"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check,
  FolderTree,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Pencil,
  Github,
  BookOpen,
} from "lucide-react";
import type { ScaffoldPlan, ScaffoldFile } from "@/lib/types";

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  file?: ScaffoldFile;
}

function buildTree(files: ScaffoldFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existingNode = currentLevel.find((n) => n.name === part);

      if (existingNode) {
        if (!isLast) {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDirectory: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        currentLevel.push(newNode);
        if (!isLast) {
          currentLevel = newNode.children;
        }
      }
    }
  }

  return root;
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  const sortedChildren = [...node.children].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        type="button"
        className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm rounded-md transition-colors ${
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (node.isDirectory) {
            onToggleDir(node.path);
          } else {
            onSelect(node.path);
          }
        }}
      >
        {node.isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-brand-400" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-brand-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {node.isDirectory && isExpanded && (
        <div>
          {sortedChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScaffoldPlanViewProps {
  plan: ScaffoldPlan;
  knowledgeSources: string[];
  onConfirm: (repoName: string, isPrivate: boolean) => void;
  isCreating: boolean;
  initialRepoName?: string;
  initialVisibility?: string;
}

export function ScaffoldPlanView({ plan, knowledgeSources, onConfirm, isCreating, initialRepoName, initialVisibility }: ScaffoldPlanViewProps) {
  const [repoName, setRepoName] = useState(initialRepoName || plan.repoName || "");
  const [visibility, setVisibility] = useState(initialVisibility || "private");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    const dirs = new Set<string>();
    for (const file of plan.structure) {
      const firstDir = file.path.split("/")[0];
      if (file.path.includes("/")) {
        dirs.add(firstDir);
      }
    }
    return dirs;
  });

  const tree = buildTree(plan.structure);
  const selectedFileData = plan.structure.find((f) => f.path === selectedFile);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const sortedTree = [...tree].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  if (plan.structure.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FolderTree className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No scaffold plan generated yet</p>
            <p className="text-xs mt-1">Use the form above to generate a scaffold plan.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Scaffold Plan
          </CardTitle>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </CardHeader>
        <CardContent>
          {/* Two-column layout: file tree + preview */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[400px]">
            {/* Left: File Tree */}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  File Structure
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({plan.structure.length} files)
                </span>
              </div>
              <div className="p-2 overflow-y-auto max-h-[500px]">
                {sortedTree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedFile}
                    onSelect={setSelectedFile}
                    expandedDirs={expandedDirs}
                    onToggleDir={toggleDir}
                  />
                ))}
              </div>
            </div>

            {/* Right: File Preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {selectedFile ? selectedFile : "File Preview"}
                </span>
              </div>
              <div className="p-4 overflow-y-auto max-h-[500px]">
                {selectedFileData ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium">{selectedFileData.path}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedFileData.description}</p>
                    {selectedFileData.content ? (
                      <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap border">
                        {selectedFileData.content}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-32 bg-muted/30 rounded-md border border-dashed">
                        <span className="text-sm text-muted-foreground">
                          Content will be generated during scaffolding
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
                    <File className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">Select a file from the tree to preview its contents</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices Applied */}
      {plan.bestPracticesApplied.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-400" />
              Best Practices Applied
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {plan.bestPracticesApplied.map((bp, i) => (
                <Badge key={i} variant="secondary">
                  <Check className="h-3 w-3 mr-1" /> {bp}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grounded In: Knowledge Sources */}
      {knowledgeSources.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-400" />
              Grounded In
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              This scaffold was generated using the following knowledge base templates:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {knowledgeSources.map((s, i) => (
                <Badge key={i} variant="outline" className="font-mono text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons and repo creation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Plan
              </Button>
            </div>
            <div className="flex gap-4 items-end pt-4 border-t">
              <div className="flex-1">
                <label className="text-sm font-medium">Repository Name</label>
                <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-awesome-project" />
              </div>
              <div className="w-36">
                <label className="text-sm font-medium">Visibility</label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => onConfirm(repoName, visibility === "private")}
                disabled={!repoName || isCreating}
              >
                <Github className="h-4 w-4 mr-2" />
                {isCreating ? "Creating..." : "Create Repository on GitHub"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
