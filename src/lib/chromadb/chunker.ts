export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    filename: string;
    category: string;
    section: string;
    chunkIndex: number;
  };
}

export function chunkMarkdown(
  filename: string,
  category: string,
  content: string
): DocumentChunk[] {
  const sections = content.split(/^## /m);
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    const sectionTitle = i === 0 ? "intro" : section.split("\n")[0].trim();
    const sectionContent = i === 0 ? section : `## ${section}`;

    chunks.push({
      id: `${filename}::chunk-${i}`,
      content: sectionContent,
      metadata: {
        filename,
        category,
        section: sectionTitle,
        chunkIndex: i,
      },
    });
  }

  return chunks;
}
