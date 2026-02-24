# Full-Stack Next.js Scaffold Guide

## Project Initialization

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir
cd my-app
```

## Recommended Directory Structure

```
src/
  app/                    # App Router pages and layouts
    (auth)/               # Route group for auth pages
      login/page.tsx
      register/page.tsx
    (dashboard)/          # Route group for authenticated pages
      layout.tsx          # Shared dashboard layout with sidebar
      page.tsx            # Dashboard home
      settings/page.tsx
    api/                  # API Route Handlers
      auth/[...nextauth]/route.ts
      health/route.ts
    layout.tsx            # Root layout
    page.tsx              # Landing page
    error.tsx             # Global error boundary
    loading.tsx           # Global loading state
    not-found.tsx         # Custom 404 page
  components/
    ui/                   # Shadcn UI primitives (button, input, card, etc.)
    layout/               # Header, sidebar, footer, navigation
    shared/               # Reusable domain components
    forms/                # Form components with validation
  hooks/                  # Custom React hooks
  lib/
    auth.ts               # Auth configuration (NextAuth options)
    db.ts                 # Database client (Prisma, Drizzle)
    utils.ts              # Shared utility functions
    validations.ts        # Zod schemas for forms and API
    constants.ts          # App-wide constants
  types/                  # TypeScript type definitions
    index.ts              # Shared types
    api.ts                # API request/response types
  styles/
    globals.css           # Tailwind imports and custom CSS
```

## Essential Dependencies

```bash
# UI Components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table dialog select

# Authentication
npm install next-auth

# Database (choose one)
npm install prisma @prisma/client    # Prisma ORM
npm install drizzle-orm drizzle-kit  # Drizzle ORM

# Validation
npm install zod

# Utilities
npm install clsx tailwind-merge lucide-react
```

## Root Layout Setup

The root layout should include: global font loading, metadata, theme provider, toast provider, and session provider.

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My App",
  description: "Full-stack Next.js application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

## Authentication Setup

Configure NextAuth with at least one OAuth provider and optional credentials:

```ts
// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub },
    }),
  },
};
```

## Database Schema Pattern

Define models with timestamps, soft delete, and proper relations:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

## API Route Pattern

```ts
// src/app/api/items/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Create item in database
  return NextResponse.json({ success: true }, { status: 201 });
}
```

## Environment Variables

```env
# .env.local (never commit this file)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

## Middleware for Auth Protection

```ts
// src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

## Pre-Commit Quality Gates

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## Deployment Checklist

- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] HTTPS configured
- [ ] Error monitoring connected (Sentry, LogRocket)
- [ ] Security headers configured in `next.config.js`
- [ ] Image optimization configured for production CDN
- [ ] Rate limiting enabled on API routes
- [ ] Logging and monitoring dashboards set up
