"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CustomTaskFormProps {
  onSubmit: (description: string) => void;
  isSubmitting: boolean;
}

export function CustomTaskForm({ onSubmit, isSubmitting }: CustomTaskFormProps) {
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description);
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="custom-task-description" className="text-sm font-medium block mb-1">
          Describe what you want the agent to do
        </label>
        <Textarea
          id="custom-task-description"
          placeholder="e.g., Review the full repo and understand what it's designed for, then document this in the README.md file in the root of the repo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
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
          "Start Task"
        )}
      </Button>
    </form>
  );
}
