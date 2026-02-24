"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { KnowledgeDocument } from "@/lib/types";

interface DocumentListProps {
  documents: Omit<KnowledgeDocument, "content">[];
  onEdit: (filename: string) => void;
  onDelete: (filename: string) => void;
  categoryFilter: string;
}

export function DocumentList({ documents, onEdit, onDelete, categoryFilter }: DocumentListProps) {
  const filtered = categoryFilter === "all"
    ? documents
    : documents.filter((d) => d.category === categoryFilter);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.filename}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {doc.category.replace("-", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {doc.metadata.updatedAt ? new Date(doc.metadata.updatedAt).toLocaleDateString() : "\u2014"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(doc.filename)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(doc.filename)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No documents found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
