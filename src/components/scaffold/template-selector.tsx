"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

export interface ScaffoldTemplate {
  id: string;
  filename: string;
  title: string;
  description: string;
  preview: string;
  updatedAt: string;
}

interface TemplateSelectorProps {
  onSubmit: (templateId: string, extraDescription: string) => void;
  isLoading: boolean;
}

export function TemplateSelector({ onSubmit, isLoading }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ScaffoldTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extraDescription, setExtraDescription] = useState("");

  const fetchTemplates = () => {
    setLoadingTemplates(true);
    setFetchError(null);
    fetch("/api/scaffold/templates")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data: { templates: ScaffoldTemplate[] }) => {
        setTemplates(data.templates ?? []);
      })
      .catch(() => setFetchError("Failed to load scaffolding templates."))
      .finally(() => setLoadingTemplates(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  return (
    <div className="space-y-5">
      {/* Template list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Select a Scaffolding Template</label>
          <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={loadingTemplates} className="gap-1.5 h-7 text-xs">
            <RefreshCw className={`h-3 w-3 ${loadingTemplates ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center justify-center h-24 border rounded-lg border-dashed border-border">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {fetchError}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 border rounded-lg border-dashed border-border text-muted-foreground gap-1">
            <FileText className="h-5 w-5 opacity-50" />
            <p className="text-sm">No scaffolding templates found in the knowledge base.</p>
            <p className="text-xs">Use the &quot;Build New Template&quot; tab to create one.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                disabled={isLoading}
                className={`text-left rounded-lg border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedId === t.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{t.title}</span>
                  </div>
                  {selectedId === t.id && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}
                <Badge variant="outline" className="mt-2 text-xs font-mono">
                  {t.filename}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template preview — shown when selected */}
      {selectedTemplate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Template Preview
            </p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed line-clamp-12 overflow-hidden">
              {selectedTemplate.preview}
              {selectedTemplate.preview.length >= 600 ? "\n…" : ""}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Extra description */}
      <div>
        <label className="text-sm font-medium">
          Additional Requirements{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Describe any extra details or customisations. Copilot will layer these on top of the selected template.
        </p>
        <Textarea
          value={extraDescription}
          onChange={(e) => setExtraDescription(e.target.value)}
          rows={3}
          placeholder="E.g. Add Stripe payment integration, use Prisma ORM instead of Drizzle, include Docker Compose setup…"
          disabled={isLoading}
        />
      </div>

      <Button
        onClick={() => selectedId && onSubmit(selectedId, extraDescription)}
        disabled={!selectedId || isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Plan…
          </>
        ) : (
          "Generate Scaffold Plan"
        )}
      </Button>
    </div>
  );
}
