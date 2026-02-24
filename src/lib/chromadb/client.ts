import { ChromaClient } from "chromadb";

let client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!client) {
    const url = process.env.CHROMADB_URL || "http://localhost:8000";

    // Parse the URL into host, port, and ssl for chromadb v3 API
    const parsed = new URL(url);
    client = new ChromaClient({
      host: parsed.hostname,
      port: parseInt(parsed.port || (parsed.protocol === "https:" ? "443" : "8000"), 10),
      ssl: parsed.protocol === "https:",
    });
  }
  return client;
}

export const COLLECTION_NAME = "repo-ninja-knowledge";
