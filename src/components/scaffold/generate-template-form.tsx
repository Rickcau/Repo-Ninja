"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Wand2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";

interface GenerateTemplateFormProps {
  /** Called when user wants to immediately use the generated template for scaffolding */
  onUseTemplate?: (templateId: string) => void;
}

export function GenerateTemplateForm({ onUseTemplate }: GenerateTemplateFormProps) {
  const [description, setDescription] = useState("");
  const [filename, setFilename] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [savedFilename, setSavedFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);
    setSavedFilename(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/scaffold/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, filename: filename || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Template generation failed.");
      } else {
        setGeneratedContent(data.content);
        setSavedFilename(data.filename);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !savedFilename) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/scaffold/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          filename: savedFilename,
          save: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save template.");
      } else {
        setSavedFilename(data.filename);
        setSaveSuccess(true);
      }
    } catch {
      setError("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseNow = () => {
    if (savedFilename && onUseTemplate) {
      onUseTemplate(savedFilename);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-sm text-primary/80">
          <span className="font-semibold text-primary">Powered by GitHub Copilot</span> — describe the type of
          project you want a scaffolding guide for and Copilot will generate a detailed markdown template.
          You can save it to your knowledge base for reuse.
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Describe the scaffolding template</label>
        <p className="text-xs text-muted-foreground mb-2">
          What stack, language, or architecture should this template cover?
        </p>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="E.g. A Python FastAPI microservice with PostgreSQL, JWT authentication, Docker, and GitHub Actions CI. Include security best practices and a well-structured project layout."
          disabled={isGenerating}
        />
      </div>

      {/* Optional filename */}
      <div>
        <label className="text-sm font-medium">
          Filename{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="e.g. python-fastapi-microservice"
          disabled={isGenerating}
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">.md extension added automatically.</p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!description.trim() || isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating with Copilot…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Generate Template
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Generated content */}
      {generatedContent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Generated Template</span>
              {savedFilename && (
                <Badge variant="outline" className="text-xs font-mono">
                  {savedFilename}
                </Badge>
              )}
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Saved to knowledge base
              </div>
            )}
          </div>

          {/* Markdown preview */}
          <Card>
            <CardContent className="pt-4 p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                {generatedContent}
              </pre>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!saveSuccess && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save to Knowledge Base
                  </>
                )}
              </Button>
            )}

            {saveSuccess && onUseTemplate && savedFilename && (
              <Button onClick={handleUseNow} className="gap-2">
                Use This Template Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
