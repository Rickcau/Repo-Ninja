"use client";

import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search, Eye } from "lucide-react";
import type { KnowledgeDocument } from "@/lib/types";

const AGENT_TYPES = ["Review", "Scaffold", "Audit"] as const;

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

interface DocumentListProps {
  documents: Omit<KnowledgeDocument, "content">[];
  onEdit: (filename: string) => void;
  onDelete: (filename: string) => void;
  onPreview?: (filename: string) => void;
  categoryFilter: string;
  agentFilter?: string;
  onAgentFilterChange?: (agent: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function DocumentList({
  documents,
  onEdit,
  onDelete,
  onPreview,
  categoryFilter,
  agentFilter = "all",
  onAgentFilterChange,
  searchQuery = "",
  onSearchChange,
}: DocumentListProps) {
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    fetch("/api/knowledge/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.documentCount != null) setTotalChunks(data.documentCount);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = documents;
    if (categoryFilter !== "all") result = result.filter((d) => d.category === categoryFilter);
    if (agentFilter !== "all") result = result.filter((d) => getUsedBy(d.category).includes(agentFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.metadata.title && d.metadata.title.toLowerCase().includes(q)) ||
          (d.metadata.tags && d.metadata.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [documents, categoryFilter, agentFilter, searchQuery]);

  const chunksPerDoc = documents.length > 0 ? Math.round(totalChunks / documents.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={searchQuery} onChange={(e) => onSearchChange?.(e.target.value)} className="pl-9" />
        </div>
        <Select value={agentFilter} onValueChange={(v) => onAgentFilterChange?.(v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Agents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {AGENT_TYPES.map((agent) => (<SelectItem key={agent} value={agent}>{agent}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Used By</TableHead>
            <TableHead className="text-right">Chunks</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((doc) => {
            const usedBy = getUsedBy(doc.category);
            return (
              <TableRow key={doc.id} className="cursor-pointer" onClick={() => onPreview?.(doc.filename)}>
                <TableCell className="font-medium">{doc.filename}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{doc.category.replace("-", " ")}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {usedBy.length > 0 ? usedBy.map((a) => (<Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)) : <span className="text-xs text-muted-foreground">--</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground font-mono">{chunksPerDoc}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {doc.metadata.updatedAt ? new Date(doc.metadata.updatedAt).toLocaleDateString() : "\u2014"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => onPreview?.(doc.filename)} title="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(doc.filename)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(doc.filename)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No documents found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
