"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NaturalLanguageFormProps {
  onSubmit: (description: string) => void;
  isLoading: boolean;
}

export function NaturalLanguageForm({ onSubmit, isLoading }: NaturalLanguageFormProps) {
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Describe what you want to build:</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="I need a React/Next.js app with GitHub OAuth, a REST API, PostgreSQL database, and Tailwind CSS styling. It should follow enterprise security best practices."
        />
      </div>
      <Button
        onClick={() => onSubmit(description)}
        disabled={!description.trim() || isLoading}
      >
        {isLoading ? "Generating Plan..." : "Generate Scaffold Plan"}
      </Button>
    </div>
  );
}
