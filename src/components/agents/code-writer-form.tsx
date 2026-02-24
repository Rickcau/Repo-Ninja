"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface CodeWriterFormProps {
  onSubmit: (description: string, targetBranch?: string) => void;
  isSubmitting: boolean;
}

export function CodeWriterForm({ onSubmit, isSubmitting }: CodeWriterFormProps) {
  const [description, setDescription] = useState("");
  const [targetBranch, setTargetBranch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description, targetBranch || undefined);
    setDescription("");
    setTargetBranch("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="description" className="text-sm font-medium block mb-1">
          Describe the code you want to write
        </label>
        <Textarea
          id="description"
          placeholder="e.g., Add a utility function that validates email addresses and returns structured error messages..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label htmlFor="targetBranch" className="text-sm font-medium block mb-1">
          Target branch (optional)
        </label>
        <Input
          id="targetBranch"
          placeholder="main"
          value={targetBranch}
          onChange={(e) => setTargetBranch(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" disabled={isSubmitting || !description.trim()}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Starting Agent...
          </>
        ) : (
          "Start Code Writer Agent"
        )}
      </Button>
    </form>
  );
}
