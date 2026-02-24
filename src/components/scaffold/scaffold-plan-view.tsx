"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, FolderTree } from "lucide-react";
import type { ScaffoldPlan } from "@/lib/types";

interface ScaffoldPlanViewProps {
  plan: ScaffoldPlan;
  knowledgeSources: string[];
  onConfirm: (repoName: string, isPrivate: boolean) => void;
  isCreating: boolean;
}

export function ScaffoldPlanView({ plan, knowledgeSources, onConfirm, isCreating }: ScaffoldPlanViewProps) {
  const [repoName, setRepoName] = useState(plan.repoName || "");
  const [visibility, setVisibility] = useState("private");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Scaffold Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{plan.description}</p>

        <div>
          <h4 className="text-sm font-medium mb-2">File Structure:</h4>
          <ul className="text-sm font-mono space-y-1">
            {plan.structure.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">{f.path}</span>
                <span className="text-xs text-muted-foreground">— {f.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Best Practices Applied:</h4>
          <div className="flex flex-wrap gap-1">
            {plan.bestPracticesApplied.map((bp, i) => (
              <Badge key={i} variant="secondary">
                <Check className="h-3 w-3 mr-1" /> {bp}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Knowledge Sources:</h4>
          <div className="flex flex-wrap gap-1">
            {knowledgeSources.map((s, i) => (
              <Badge key={i} variant="outline">{s}</Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-4 items-end pt-4 border-t">
          <div className="flex-1">
            <label className="text-sm font-medium">Repo Name</label>
            <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="text-sm font-medium">Visibility</label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => onConfirm(repoName, visibility === "private")}
            disabled={!repoName || isCreating}
          >
            {isCreating ? "Creating..." : "Create Repo & Scaffold"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
