"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Database, HeartPulse, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useKnowledge } from "@/hooks/use-knowledge";
import { DocumentList } from "@/components/knowledge/document-list";
import { DocumentEditor } from "@/components/knowledge/document-editor";
import { ContentPreview } from "@/components/knowledge/content-preview";
import type { KnowledgeCategory } from "@/lib/types";

export default function KnowledgePage() {
  const {
    documents,
    isLoading,
    status,
    getDocument,
    saveDocument,
    updateDocument,
    deleteDocument,
    reindexAll,
  } = useKnowledge();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<{
    filename?: string;
    category?: KnowledgeCategory;
    content?: string;
    isNew: boolean;
  } | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [preview, setPreview] = useState<{
    filename: string;
    category: string;
    content: string;
    title?: string;
    tags?: string[];
    updatedAt?: string;
  } | null>(null);
  const [healthResult, setHealthResult] = useState<{
    healthy: boolean;
    totalChunks: number;
    totalDiskDocs: number;
    outOfSync: string[];
    error?: string;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const handleEdit = async (filename: string) => {
    const doc = await getDocument(filename);
    if (doc) {
      setEditing({
        filename: doc.filename,
        category: doc.category as KnowledgeCategory,
        content: doc.content,
        isNew: false,
      });
      setPreview(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (confirm(`Delete ${filename}?`)) {
      await deleteDocument(filename);
      if (preview?.filename === filename) {
        setPreview(null);
      }
    }
  };

  const handlePreview = async (filename: string) => {
    const doc = await getDocument(filename);
    if (doc) {
      // Find the document metadata from the list
      const docMeta = documents.find((d) => d.filename === filename);
      setPreview({
        filename: doc.filename,
        category: doc.category,
        content: doc.content,
        title: docMeta?.metadata?.title,
        tags: docMeta?.metadata?.tags,
        updatedAt: docMeta?.metadata?.updatedAt,
      });
      setEditing(null);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    await reindexAll();
    setReindexing(false);
  };

  const handleIndexHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/knowledge/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealthResult(data);
    } catch (err) {
      setHealthResult({
        healthy: false,
        totalChunks: 0,
        totalDiskDocs: 0,
        outOfSync: [],
        error: err instanceof Error ? err.message : "Failed to check health",
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage documents that power AI agents and code reviews.
          </p>
        </div>
        <Button onClick={() => { setEditing({ isNew: true }); setPreview(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* ChromaDB Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>ChromaDB:</span>
              <Badge variant="outline" className="gap-1.5">
                {status.connected ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                )}
                {status.connected ? "Connected" : "Disconnected"}
              </Badge>
              {status.connected && (
                <span className="text-muted-foreground">({status.documentCount} chunks indexed)</span>
              )}
            </div>

            {status.connected && healthResult && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{healthResult.totalDiskDocs} docs on disk, {healthResult.totalChunks} chunks indexed</span>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleIndexHealth} disabled={healthLoading}>
                {healthLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <HeartPulse className="h-4 w-4 mr-2" />
                )}
                {healthLoading ? "Checking..." : "Index Health"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReindex} disabled={reindexing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${reindexing ? "animate-spin" : ""}`} />
                {reindexing ? "Re-indexing..." : "Re-index All"}
              </Button>
            </div>
          </div>

          {/* Health check results */}
          {healthResult && (
            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                healthResult.healthy
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {healthResult.healthy ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {healthResult.healthy
                    ? "All documents indexed and in sync"
                    : healthResult.error || "Index out of sync"}
                </span>
              </div>
              {healthResult.outOfSync.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-xs mt-2">
                  {healthResult.outOfSync.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <DocumentEditor
          filename={editing.filename}
          initialCategory={editing.category}
          initialContent={editing.content}
          isNew={editing.isNew}
          onSave={editing.isNew ? saveDocument : updateDocument}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <DocumentList
                documents={documents}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPreview={handlePreview}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                agentFilter={agentFilter}
                onAgentFilterChange={setAgentFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </CardContent>
          </Card>

          {preview && (
            <ContentPreview
              filename={preview.filename}
              category={preview.category}
              content={preview.content}
              title={preview.title}
              tags={preview.tags}
              updatedAt={preview.updatedAt}
              onClose={() => setPreview(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
