import { chunkMarkdown, DocumentChunk } from "@/lib/chromadb/chunker";

describe("chunkMarkdown", () => {
  it("returns an empty array for empty content", () => {
    const result = chunkMarkdown("file.md", "best-practices", "");
    expect(result).toEqual([]);
  });

  it("returns an empty array for whitespace-only content", () => {
    const result = chunkMarkdown("file.md", "best-practices", "   \n  \n  ");
    expect(result).toEqual([]);
  });

  it('returns one chunk with "intro" section when there are no ## headers', () => {
    const content = "This is a simple document with no headings.\nJust some text.";
    const result = chunkMarkdown("readme.md", "scaffolding", content);

    expect(result).toHaveLength(1);
    expect(result[0].metadata.section).toBe("intro");
    expect(result[0].content).toBe(content);
    expect(result[0].id).toBe("readme.md::chunk-0");
    expect(result[0].metadata.chunkIndex).toBe(0);
  });

  it("splits multiple ## sections correctly", () => {
    const content = [
      "Intro text here.",
      "",
      "## Section One",
      "Content of section one.",
      "",
      "## Section Two",
      "Content of section two.",
    ].join("\n");

    const result = chunkMarkdown("guide.md", "review-instructions", content);

    expect(result).toHaveLength(3);

    // Intro chunk
    expect(result[0].metadata.section).toBe("intro");
    expect(result[0].content).toBe("Intro text here.");

    // Section One
    expect(result[1].metadata.section).toBe("Section One");
    expect(result[1].content).toContain("## Section One");
    expect(result[1].content).toContain("Content of section one.");

    // Section Two
    expect(result[2].metadata.section).toBe("Section Two");
    expect(result[2].content).toContain("## Section Two");
    expect(result[2].content).toContain("Content of section two.");
  });

  it("generates chunk IDs following the pattern filename::chunk-N", () => {
    const content = "Intro\n\n## A\nText A\n\n## B\nText B";
    const result = chunkMarkdown("test.md", "best-practices", content);

    result.forEach((chunk, i) => {
      expect(chunk.id).toBe(`test.md::chunk-${i}`);
    });
  });

  it("sets correct metadata on each chunk", () => {
    const content = "Intro\n\n## Heading\nBody";
    const result = chunkMarkdown("doc.md", "architecture-patterns", content);

    for (const chunk of result) {
      expect(chunk.metadata.filename).toBe("doc.md");
      expect(chunk.metadata.category).toBe("architecture-patterns");
    }

    expect(result[0].metadata.section).toBe("intro");
    expect(result[0].metadata.chunkIndex).toBe(0);
    expect(result[1].metadata.section).toBe("Heading");
    expect(result[1].metadata.chunkIndex).toBe(1);
  });

  it("handles content that starts with a ## heading (no intro)", () => {
    const content = "## First Section\nSome content.";
    const result = chunkMarkdown("no-intro.md", "best-practices", content);

    // split on "## " produces ["", "First Section\nSome content."]
    // empty string is skipped, so only one chunk at index 1
    expect(result).toHaveLength(1);
    expect(result[0].metadata.section).toBe("First Section");
    expect(result[0].id).toBe("no-intro.md::chunk-1");
  });
});
