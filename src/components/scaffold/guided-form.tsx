"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = {
  framework: ["React/Next.js", "Python/FastAPI", "Node/Express", ".NET Web API"],
  language: ["TypeScript", "JavaScript", "Python", "C#"],
  auth: ["GitHub OAuth", "Azure AD", "JWT", "None"],
  database: ["PostgreSQL", "MongoDB", "SQLite", "None"],
  styling: ["TailwindCSS", "CSS Modules", "Styled Components", "None"],
  cicd: ["GitHub Actions", "Azure DevOps", "None"],
};

interface GuidedFormProps {
  onSubmit: (options: Record<string, string>) => void;
  isLoading: boolean;
}

export function GuidedForm({ onSubmit, isLoading }: GuidedFormProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const update = (key: string, value: string) =>
    setSelections((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(OPTIONS).map(([key, values]) => (
          <div key={key}>
            <label className="text-sm font-medium capitalize">{key}</label>
            <Select value={selections[key] || ""} onValueChange={(v) => update(key, v)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${key}`} />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button
        onClick={() => onSubmit(selections)}
        disabled={Object.keys(selections).length < 2 || isLoading}
      >
        {isLoading ? "Generating Plan..." : "Generate Scaffold Plan"}
      </Button>
    </div>
  );
}
