import {
  buildScaffoldPrompt,
  buildReviewPrompt,
  buildIssueSolverPrompt,
  buildAuditPrompt,
} from "@/lib/copilot-sdk/prompts";
import type { KnowledgeResult } from "@/lib/types";

function makeKnowledgeDoc(overrides: Partial<KnowledgeResult> = {}): KnowledgeResult {
  return {
    id: "doc-1",
    content: "Some best practice content.",
    metadata: {
      category: "best-practices",
      filename: "react-nextjs.md",
      title: "React & Next.js Best Practices",
      tags: ["react", "nextjs"],
      updatedAt: "2025-01-01T00:00:00Z",
    },
    score: 0.95,
    ...overrides,
  };
}

describe("buildScaffoldPrompt", () => {
  it("includes the user description", () => {
    const prompt = buildScaffoldPrompt("A Next.js SaaS app", [makeKnowledgeDoc()]);
    expect(prompt).toContain("A Next.js SaaS app");
  });

  it("includes knowledge doc content and filename", () => {
    const doc = makeKnowledgeDoc();
    const prompt = buildScaffoldPrompt("test", [doc]);
    expect(prompt).toContain("--- react-nextjs.md ---");
    expect(prompt).toContain("Some best practice content.");
  });

  it("includes multiple knowledge docs", () => {
    const docs = [
      makeKnowledgeDoc({ id: "d1", metadata: { ...makeKnowledgeDoc().metadata, filename: "a.md" } }),
      makeKnowledgeDoc({ id: "d2", metadata: { ...makeKnowledgeDoc().metadata, filename: "b.md" } }),
    ];
    const prompt = buildScaffoldPrompt("test", docs);
    expect(prompt).toContain("--- a.md ---");
    expect(prompt).toContain("--- b.md ---");
  });
});

describe("buildReviewPrompt", () => {
  it("includes the code to review", () => {
    const prompt = buildReviewPrompt("const x = 1;", ["security"], [makeKnowledgeDoc()]);
    expect(prompt).toContain("const x = 1;");
  });

  it("includes review types", () => {
    const prompt = buildReviewPrompt("code", ["security", "performance"], [makeKnowledgeDoc()]);
    expect(prompt).toContain("security, performance");
  });

  it("includes knowledge base context", () => {
    const prompt = buildReviewPrompt("code", ["general"], [makeKnowledgeDoc()]);
    expect(prompt).toContain("--- react-nextjs.md ---");
    expect(prompt).toContain("Some best practice content.");
  });
});

describe("buildIssueSolverPrompt", () => {
  it("includes issue title and body", () => {
    const prompt = buildIssueSolverPrompt(
      "Login redirect broken",
      "After login, user is sent to 404",
      "repo structure here",
      [makeKnowledgeDoc()]
    );
    expect(prompt).toContain("Login redirect broken");
    expect(prompt).toContain("After login, user is sent to 404");
  });

  it("includes repo context", () => {
    const prompt = buildIssueSolverPrompt("title", "body", "src/\n  app/\n  lib/", [makeKnowledgeDoc()]);
    expect(prompt).toContain("src/\n  app/\n  lib/");
  });

  it("includes knowledge base context", () => {
    const prompt = buildIssueSolverPrompt("t", "b", "ctx", [makeKnowledgeDoc()]);
    expect(prompt).toContain("--- react-nextjs.md ---");
  });
});

describe("buildAuditPrompt", () => {
  it("includes repo structure", () => {
    const prompt = buildAuditPrompt("package.json\nsrc/app/page.tsx", [makeKnowledgeDoc()]);
    expect(prompt).toContain("package.json\nsrc/app/page.tsx");
  });

  it("includes knowledge docs", () => {
    const prompt = buildAuditPrompt("structure", [makeKnowledgeDoc()]);
    expect(prompt).toContain("--- react-nextjs.md ---");
    expect(prompt).toContain("Some best practice content.");
  });
});
