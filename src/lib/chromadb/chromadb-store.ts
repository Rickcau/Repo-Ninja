import { getChromaClient, COLLECTION_NAME } from "./client";
import { chunkMarkdown } from "./chunker";
import type { KnowledgeStore, KnowledgeResult, DocMetadata } from "@/lib/types";

export class ChromaDBStore implements KnowledgeStore {
  async search(query: string, topK: number): Promise<KnowledgeResult[]> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });

    const results = await collection.query({
      queryTexts: [query],
      nResults: topK,
    });

    if (!results.ids[0]) return [];

    return results.ids[0].map((id, i) => ({
      id,
      content: results.documents[0]?.[i] || "",
      metadata: (results.metadatas[0]?.[i] as unknown as DocMetadata) || {
        category: "best-practices" as const,
        filename: "",
        title: "",
        tags: [],
        updatedAt: "",
      },
      score: results.distances?.[0]?.[i] ?? 0,
    }));
  }

  async upsert(
    docId: string,
    content: string,
    metadata: DocMetadata
  ): Promise<void> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });

    const chunks = chunkMarkdown(metadata.filename, metadata.category, content);

    // ChromaDB rejects empty arrays in metadata — strip tags if empty
    const { tags, ...metaWithoutTags } = metadata;
    const sanitizedMeta = tags && tags.length > 0 ? metadata : metaWithoutTags;

    try {
      const existing = await collection.get({
        where: { filename: metadata.filename },
      });
      if (existing.ids.length > 0) {
        await collection.delete({ ids: existing.ids });
      }
    } catch {
      /* Collection may be empty or filter may not match */
    }

    await collection.add({
      ids: chunks.map((c) => c.id),
      documents: chunks.map((c) => c.content),
      metadatas: chunks.map((c) => ({
        ...sanitizedMeta,
        section: c.metadata.section,
        chunkIndex: c.metadata.chunkIndex,
      })),
    });
  }

  async delete(docId: string): Promise<void> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });

    const existing = await collection.get({
      where: { filename: docId },
    });
    if (existing.ids.length > 0) {
      await collection.delete({ ids: existing.ids });
    }
  }

  async reindexAll(): Promise<void> {
    const client = getChromaClient();
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
    } catch {
      /* Collection may not exist */
    }
    await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });
  }

  async getStatus(): Promise<{ connected: boolean; documentCount: number }> {
    try {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({
        name: COLLECTION_NAME,
      });
      const count = await collection.count();
      return { connected: true, documentCount: count };
    } catch {
      return { connected: false, documentCount: 0 };
    }
  }
}
