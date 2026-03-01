import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";

interface TestResult {
  step: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  durationMs?: number;
}

/** Safely read a package.json version from node_modules at runtime (no require/import). */
function getPackageVersion(packageName: string): string | null {
  try {
    const pkgPath = join(process.cwd(), "node_modules", packageName, "package.json");
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const results: TestResult[] = [];

  // Step 1: Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    results.push({
      step: "Authentication",
      status: "fail",
      detail: "No GitHub session found. Please sign in via GitHub OAuth first.",
    });
    return NextResponse.json({ results });
  }
  results.push({
    step: "Authentication",
    status: "pass",
    detail: `Signed in as ${session.user?.email || session.user?.name || "unknown"}. Access token present (${session.accessToken.substring(0, 8)}...).`,
  });

  // Step 2: Check @github/copilot-sdk package
  const sdkVersion = getPackageVersion("@github/copilot-sdk");
  if (sdkVersion) {
    results.push({
      step: "SDK Package",
      status: "pass",
      detail: `@github/copilot-sdk v${sdkVersion} installed.`,
    });
  } else {
    results.push({
      step: "SDK Package",
      status: "fail",
      detail: "@github/copilot-sdk not found in node_modules.",
    });
    return NextResponse.json({ results });
  }

  // Step 3: Check @github/copilot CLI package
  const cliVersion = getPackageVersion("@github/copilot");
  if (cliVersion) {
    results.push({
      step: "CLI Package",
      status: "pass",
      detail: `@github/copilot v${cliVersion} installed.`,
    });
  } else {
    results.push({
      step: "CLI Package",
      status: "fail",
      detail: "@github/copilot not found. The SDK requires the Copilot CLI to be installed.",
    });
    return NextResponse.json({ results });
  }

  // Step 4: Check platform-specific binary (using fs, not require.resolve to avoid bundler issues)
  const platform = process.platform;
  const arch = process.arch;
  const binaryPkg = `@github/copilot-${platform}-${arch}`;
  const binaryDir = join(process.cwd(), "node_modules", "@github", `copilot-${platform}-${arch}`);
  const binaryPath = join(binaryDir, "copilot");
  const binaryExists = existsSync(binaryPath);

  if (binaryExists) {
    results.push({
      step: "Platform Binary",
      status: "pass",
      detail: `${binaryPkg} found at ${binaryPath}`,
    });
  } else {
    const nodeVersion = parseInt(process.versions.node.split(".")[0], 10);
    results.push({
      step: "Platform Binary",
      status: "fail",
      detail: `${binaryPkg} not installed at ${binaryDir}. Fallback requires Node 24+ (current: v${process.versions.node}). ${
        nodeVersion < 24
          ? "This will NOT work — either install the platform binary or upgrade to Node 24."
          : "Node 24+ detected, fallback may work."
      }`,
    });
  }

  // Step 5: Check if the binary is executable (glibc vs musl)
  if (binaryExists) {
    try {
      const output = execSync(`"${binaryPath}" --version 2>&1`, {
        timeout: 10000,
        env: { ...process.env },
      }).toString().trim();
      results.push({
        step: "Binary Execution",
        status: "pass",
        detail: `Copilot CLI runs: ${output}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isLibcIssue = msg.includes("not found") || msg.includes("No such file") || msg.includes("ENOENT");
      results.push({
        step: "Binary Execution",
        status: "fail",
        detail: isLibcIssue
          ? `Binary cannot execute — likely glibc/musl incompatibility. If running on Alpine Linux, switch to a Debian-based Docker image (node:20-slim instead of node:20-alpine). Error: ${msg.substring(0, 200)}`
          : `Binary execution failed: ${msg.substring(0, 300)}`,
      });
    }
  } else {
    results.push({
      step: "Binary Execution",
      status: "skip",
      detail: "Platform binary not found, skipping execution test.",
    });
  }

  // Step 6: Test Copilot SDK connection
  const body = await request.json().catch(() => ({}));
  const skipSdkTest = (body as { skipSdkTest?: boolean })?.skipSdkTest;

  if (skipSdkTest) {
    results.push({
      step: "SDK Connection",
      status: "skip",
      detail: "Skipped SDK connection test.",
    });
  } else {
    const start = Date.now();
    try {
      const { getCopilotClient } = await import("@/lib/copilot-sdk/client");
      const client = getCopilotClient(session.accessToken);

      await client.start();
      results.push({
        step: "SDK Start",
        status: "pass",
        detail: "CopilotClient.start() succeeded.",
        durationMs: Date.now() - start,
      });

      try {
        const authStatus = await client.getAuthStatus();
        results.push({
          step: "SDK Auth Status",
          status: "pass",
          detail: `Auth status: ${JSON.stringify(authStatus)}`,
        });
      } catch (e) {
        results.push({
          step: "SDK Auth Status",
          status: "fail",
          detail: `getAuthStatus() failed: ${e instanceof Error ? e.message : String(e)}`,
        });
      }

      // Quick prompt test
      const promptStart = Date.now();
      try {
        const model = process.env.COPILOT_MODEL || "gpt-4.1";
        const sess = await client.createSession({ model });
        results.push({
          step: "SDK Create Session",
          status: "pass",
          detail: `Session created with model "${model}". SessionId: ${sess.sessionId}`,
          durationMs: Date.now() - promptStart,
        });

        const sendStart = Date.now();
        const response = await sess.sendAndWait(
          { prompt: 'Reply with exactly: {"test":"ok"}' },
          30000
        );
        const content = response?.data?.content ?? "";
        results.push({
          step: "SDK Send & Wait",
          status: content.includes("ok") ? "pass" : "fail",
          detail: content
            ? `Response (${content.length} chars): ${content.substring(0, 200)}`
            : "Empty response received.",
          durationMs: Date.now() - sendStart,
        });

        await sess.destroy();
      } catch (e) {
        results.push({
          step: "SDK Prompt Test",
          status: "fail",
          detail: `Prompt test failed: ${e instanceof Error ? e.message : String(e)}`,
          durationMs: Date.now() - promptStart,
        });
      }

      await client.stop();
    } catch (e) {
      results.push({
        step: "SDK Connection",
        status: "fail",
        detail: `CopilotClient failed: ${e instanceof Error ? e.message : String(e)}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // Step 7: Environment info
  results.push({
    step: "Environment",
    status: "pass",
    detail: `Node ${process.versions.node} | ${platform}-${arch} | ${process.env.NODE_ENV || "development"}`,
  });

  return NextResponse.json({ results });
}
