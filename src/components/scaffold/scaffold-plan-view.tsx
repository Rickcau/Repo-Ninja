"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  Plus,
  Save,
  Terminal,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
    const parts = file.path.split("/").filter(Boolean);
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
        <span className="truncate" title={node.path}>{node.name}</span>
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
  onPlanChange?: (updated: ScaffoldPlan) => void;
  isCreating: boolean;
  initialRepoName?: string;
  initialVisibility?: string;
}

// Split into batches of `size` (mirrors server logic so the preview is accurate)
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildFileGenPrompts(plan: ScaffoldPlan): Array<{ index: number; total: number; system: string; user: string }> {
  const batches = chunkArray(plan.structure, 5);
  const system =
    "You are an expert developer. Respond with a valid JSON array only — no markdown code fences, no explanation, just the raw JSON array.";
  return batches.map((batch, i) => ({
    index: i + 1,
    total: batches.length,
    system,
    user: `Generate complete file contents for these files. Return ONLY a valid JSON array — no markdown fences, no explanation.\n\nFiles:\n${JSON.stringify(
      batch.map((f) => ({ path: f.path, description: f.description })),
      null,
      2
    )}\n\nFormat: [{ "path": "...", "content": "..." }]\nBest practices: ${plan.bestPracticesApplied.join(", ")}`,
  }));
}

export function ScaffoldPlanView({ plan, knowledgeSources, onConfirm, onPlanChange, isCreating, initialRepoName, initialVisibility }: ScaffoldPlanViewProps) {
  const [repoName, setRepoName] = useState(initialRepoName || plan.repoName || "");
  const [visibility, setVisibility] = useState(initialVisibility || "private");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [treeWidth, setTreeWidth] = useState(320);
  const [isEditing, setIsEditing] = useState(false);
  const [editablePlan, setEditablePlan] = useState<ScaffoldPlan>(plan);
  const [showPrompts, setShowPrompts] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  const [newBestPractice, setNewBestPractice] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(180, Math.min(600, e.clientX - rect.left));
      setTreeWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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

  const startEdit = () => {
    setEditablePlan({ ...plan, structure: plan.structure.map((f) => ({ ...f })) });
    setIsEditing(true);
  };

  const saveEdit = () => {
    onPlanChange?.(editablePlan);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditablePlan(plan);
    setIsEditing(false);
  };

  const updateFile = (index: number, field: keyof ScaffoldFile, value: string) => {
    setEditablePlan((prev) => {
      const structure = prev.structure.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      );
      return { ...prev, structure };
    });
  };

  const removeFile = (index: number) => {
    setEditablePlan((prev) => ({
      ...prev,
      structure: prev.structure.filter((_, i) => i !== index),
    }));
  };

  const addFile = () => {
    setEditablePlan((prev) => ({
      ...prev,
      structure: [...prev.structure, { path: "", description: "" }],
    }));
  };

  const removeBestPractice = (index: number) => {
    setEditablePlan((prev) => ({
      ...prev,
      bestPracticesApplied: prev.bestPracticesApplied.filter((_, i) => i !== index),
    }));
  };

  const addBestPractice = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setEditablePlan((prev) => ({
      ...prev,
      bestPracticesApplied: [...prev.bestPracticesApplied, trimmed],
    }));
    setNewBestPractice("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {isEditing ? "Edit Scaffold Plan" : "Scaffold Plan"}
            {isEditing && (
              <span className="ml-auto flex gap-2">
                <Button size="sm" onClick={saveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </span>
            )}
          </CardTitle>
          {isEditing ? (
            <Textarea
              value={editablePlan.description}
              onChange={(e) => setEditablePlan((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 text-sm resize-none"
              rows={2}
              placeholder="Plan description"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {/* Edit mode: flat file list editor */}
          {isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  File Structure ({editablePlan.structure.length} files)
                </span>
                <Button size="sm" variant="outline" onClick={addFile}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add File
                </Button>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {editablePlan.structure.map((file, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={file.path}
                      onChange={(e) => updateFile(i, "path", e.target.value)}
                      placeholder="path/to/file.ts"
                      className="flex-[2] font-mono text-xs h-8"
                    />
                    <Input
                      value={file.description}
                      onChange={(e) => updateFile(i, "description", e.target.value)}
                      placeholder="Description"
                      className="flex-[3] text-xs h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column layout: file tree + preview (read mode only) */}
          <div ref={containerRef} className={`flex min-h-[400px] ${isEditing ? "hidden" : ""}`}>
            {/* Left: File Tree */}
            <div className="border rounded-lg overflow-hidden flex-shrink-0" style={{ width: treeWidth }}>
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  File Structure
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({plan.structure.length} files)
                </span>
              </div>
              <div className="p-2 overflow-y-auto overflow-x-auto max-h-[500px]">
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

            {/* Resize handle */}
            <div
              className="w-2 mx-1 flex-shrink-0 flex items-center justify-center cursor-col-resize group"
              onMouseDown={() => {
                isResizing.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            >
              <div className="w-0.5 h-10 bg-border rounded-full group-hover:bg-primary/50 transition-colors" />
            </div>

            {/* Right: File Preview */}
            <div className="flex-1 border rounded-lg overflow-hidden min-w-0">
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
      {(plan.bestPracticesApplied.length > 0 || isEditing) && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-400" />
              Best Practices Applied
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(isEditing ? editablePlan : plan).bestPracticesApplied.map((bp, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  <Check className="h-3 w-3 mr-1" /> {bp}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeBestPractice(i)}
                      className="ml-1 rounded-full hover:text-destructive leading-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {isEditing && (
                <Input
                  value={newBestPractice}
                  onChange={(e) => setNewBestPractice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBestPractice(newBestPractice);
                    }
                  }}
                  placeholder="Add practice…"
                  className="h-6 text-xs px-2 w-36"
                />
              )}
            </div>
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-2">Press Enter to add a best practice.</p>
            )}
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
              <Button variant="outline" size="sm" disabled={isEditing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={isEditing ? cancelEdit : startEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel Edit" : "Edit Plan"}
              </Button>
              {isEditing && (
                <Button size="sm" onClick={saveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={isEditing} onClick={() => setShowPrompts(true)}>
                <Terminal className="h-4 w-4 mr-2" />
                View Prompts
              </Button>
            </div>
            {!isEditing && (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── View Prompts Dialog ─────────────────────────────────── */}
      <Dialog open={showPrompts} onOpenChange={setShowPrompts}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Raw Prompts Sent to Copilot SDK
            </DialogTitle>
            <DialogDescription>
              These are the exact prompts sent to the Copilot SDK when generating file contents.
              The plan has <strong>{plan.structure.length} files</strong> split into{" "}
              <strong>{chunkArray(plan.structure, 5).length} batches</strong> of up to 5 files each.
              Copy any prompt and paste it into a Copilot/AI session to test it directly.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {buildFileGenPrompts(plan).map((p) => {
              const fullText = `SYSTEM:\n${p.system}\n\n---\n\nUSER:\n${p.user}`;
              return (
                <div key={p.index} className="border rounded-md overflow-hidden text-xs">
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b">
                    <span className="font-medium font-mono">
                      Batch {p.index} / {p.total} &mdash;{" "}
                      {chunkArray(plan.structure, 5)[p.index - 1].length} file(s):{" "}
                      {chunkArray(plan.structure, 5)[p.index - 1].map((f) => f.path).join(", ")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => handleCopyPrompt(fullText, p.index)}
                    >
                      {copiedIndex === p.index ? (
                        <><ClipboardCheck className="h-3.5 w-3.5 text-green-500" />Copied!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" />Copy</>
                      )}
                    </Button>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">System message</p>
                      <pre className="whitespace-pre-wrap font-mono bg-muted/30 rounded p-2 text-[11px] leading-relaxed">{p.system}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">User prompt</p>
                      <pre className="whitespace-pre-wrap font-mono bg-muted/30 rounded p-2 text-[11px] leading-relaxed">{p.user}</pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
