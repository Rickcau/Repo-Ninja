"use client";

import { useState, useEffect, useCallback } from "react";
import type { KnowledgeDocument, KnowledgeCategory } from "@/lib/types";

export function useKnowledge() {
  const [documents, setDocuments] = useState<Omit<KnowledgeDocument, "content">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ connected: boolean; documentCount: number }>({
    connected: false,
    documentCount: 0,
  });

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, documentCount: 0 });
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStatus();
  }, [fetchDocuments, fetchStatus]);

  const getDocument = async (filename: string): Promise<{ filename: string; category: string; content: string } | null> => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`);
    if (!res.ok) return null;
    return res.json();
  };

  const saveDocument = async (filename: string, category: KnowledgeCategory, content: string) => {
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, category, content }),
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const updateDocument = async (filename: string, category: KnowledgeCategory, content: string) => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, content }),
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const deleteDocument = async (filename: string) => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const reindexAll = async () => {
    const res = await fetch("/api/knowledge/reindex", { method: "POST" });
    if (res.ok) await fetchStatus();
    return res.ok;
  };

  return {
    documents,
    isLoading,
    status,
    getDocument,
    saveDocument,
    updateDocument,
    deleteDocument,
    reindexAll,
    refresh: fetchDocuments,
  };
}
