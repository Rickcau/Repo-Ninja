import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

const FALLBACK_OPTIONS: Record<string, string[]> = {
  framework: ["React/Next.js", "Python/FastAPI", "Node/Express", ".NET Web API"],
  language: ["TypeScript", "JavaScript", "Python", "C#"],
  auth: ["GitHub OAuth", "Azure AD", "JWT", "None"],
  database: ["PostgreSQL", "MongoDB", "SQLite", "None"],
  styling: ["TailwindCSS", "CSS Modules", "Styled Components", "None"],
  cicd: ["GitHub Actions", "Azure DevOps", "None"],
};

export async function GET() {
  try {
    const store = new ChromaDBStore();
    const docs = await store.search("scaffolding templates frameworks", 10);

    if (docs.length === 0) {
      return NextResponse.json({ options: FALLBACK_OPTIONS, source: "fallback" });
    }

    // Extract options from KB documents
    const extracted: Record<string, Set<string>> = {
      framework: new Set<string>(),
      language: new Set<string>(),
      auth: new Set<string>(),
      database: new Set<string>(),
      styling: new Set<string>(),
      cicd: new Set<string>(),
    };

    const patterns: Record<string, RegExp> = {
      framework: /(?:react|next\.?js|express|fastapi|django|flask|\.net|spring|vue|angular|svelte|nuxt)/gi,
      language: /(?:typescript|javascript|python|c#|java|go|rust|ruby)/gi,
      auth: /(?:oauth|jwt|azure ad|github oauth|auth0|cognito|firebase auth|none)/gi,
      database: /(?:postgresql|postgres|mongodb|mysql|sqlite|dynamodb|redis|none)/gi,
      styling: /(?:tailwind(?:css)?|css modules?|styled.components?|sass|less|none)/gi,
      cicd: /(?:github actions?|azure devops|jenkins|circleci|gitlab ci|none)/gi,
    };

    for (const doc of docs) {
      for (const [key, regex] of Object.entries(patterns)) {
        const matches = doc.content.match(regex);
        if (matches) {
          for (const m of matches) extracted[key].add(m);
        }
      }
    }

    // Merge with fallbacks
    const options: Record<string, string[]> = {};
    for (const key of Object.keys(FALLBACK_OPTIONS)) {
      const kbValues = Array.from(extracted[key]);
      options[key] = kbValues.length > 0 ? kbValues : FALLBACK_OPTIONS[key];
    }

    return NextResponse.json({ options, source: "knowledge-base" });
  } catch {
    return NextResponse.json({ options: FALLBACK_OPTIONS, source: "fallback" });
  }
}
