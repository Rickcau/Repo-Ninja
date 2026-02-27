"use client";

import { useEffect, useState } from "react";
import { Bug, Code, ListChecks, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KbDoc {
  name: string;
  section: string;
  score?: number;
}

interface AgentTypeEntry {
  id: AgentTypeId;
  title: string;
  description: string;
  icon: typeof Bug;
  kbDocuments: KbDoc[];
}

const AGENT_TYPE_DEFS: Omit<AgentTypeEntry, "kbDocuments">[] = [
  {
    id: "issue-solver",
    title: "Issue Solver",
    description:
      "Reads a GitHub issue, queries the knowledge base for relevant patterns, and generates a fix as a pull request.",
    icon: Bug,
  },
  {
    id: "code-writer",
    title: "Code Writer",
    description:
      "Takes a natural-language description and scaffolds code grounded in your team's standards and templates.",
    icon: Code,
  },
  {
    id: "custom-task",
    title: "Custom Task",
    description:
      "Define a custom objective for the agent. It will select relevant KB documents automatically based on your prompt.",
    icon: ListChecks,
  },
];

export type AgentTypeId = "issue-solver" | "code-writer" | "custom-task";

interface AgentTypeSelectorProps {
  selected: AgentTypeId | null;
  onSelect: (type: AgentTypeId) => void;
}

export function AgentTypeSelector({ selected, onSelect }: AgentTypeSelectorProps) {
  const [kbMap, setKbMap] = useState<Record<string, KbDoc[]>>({});

  useEffect(() => {
    fetch("/api/agents/types")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.types) {
          const map: Record<string, KbDoc[]> = {};
          for (const t of data.types) {
            map[t.id] = t.kbDocuments || [];
          }
          setKbMap(map);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {AGENT_TYPE_DEFS.map((agent) => {
        const isSelected = selected === agent.id;
        const Icon = agent.icon;
        const docs = kbMap[agent.id] || [];

        return (
          <Card
            key={agent.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:border-primary/50",
              isSelected &&
                "border-primary shadow-[0_0_20px_var(--primary-glow-soft)]"
            )}
            onClick={() => onSelect(agent.id)}
          >
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-md",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">{agent.title}</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {agent.description}
              </p>

              {docs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    KB Documents
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {docs.map((doc) => (
                      <Badge
                        key={doc.name + doc.section}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {doc.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
