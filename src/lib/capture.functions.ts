import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  source: z.string().min(1).max(500_000),
  kind: z.enum(["url", "text"]),
});

const ResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  keyPoints: z.array(z.string()),
  markdown: z.string(),
});

async function fetchUrlAsText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; XCaptureBot/1.0; +https://xcapture.lovable.app)",
    },
  });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();
  // strip scripts/styles and tags
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 30_000);
}

export const captureArticle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    let source = data.source;
    let sourceUrl: string | null = null;
    if (data.kind === "url") {
      sourceUrl = data.source;
      source = await fetchUrlAsText(data.source);
    }

    const gateway = createLovableAiGatewayProvider(key);
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "You convert articles or X (Twitter) posts into clean, Obsidian-ready Markdown notes. " +
        "Write in the same language as the source. Be concise but preserve the author's key arguments.",
      prompt: `Source ${sourceUrl ? `URL: ${sourceUrl}\n\n` : ""}Content:\n\n${source}\n\n` +
        `Produce:\n- A short, descriptive title\n- A 2-4 sentence summary\n- 3-8 lowercase tags (no #, no spaces, use dashes)\n- 3-7 key bullet points\n- A full markdown note body (without frontmatter) including a "## Summary", "## Key points", and "## Notes" section.`,
      experimental_output: Output.object({
        schema: z.object({
          title: z.string(),
          summary: z.string(),
          tags: z.array(z.string()),
          keyPoints: z.array(z.string()),
          markdownBody: z.string(),
        }),
      }),
    });

    const o = experimental_output;
    const frontmatter = [
      "---",
      `title: "${o.title.replace(/"/g, '\\"')}"`,
      sourceUrl ? `source: ${sourceUrl}` : null,
      `captured: ${new Date().toISOString()}`,
      `tags: [${o.tags.map((t) => `"${t}"`).join(", ")}]`,
      "---",
      "",
    ]
      .filter(Boolean)
      .join("\n");

    const markdown = `${frontmatter}# ${o.title}\n\n${o.markdownBody}\n`;

    return ResultSchema.parse({
      title: o.title,
      summary: o.summary,
      tags: o.tags,
      keyPoints: o.keyPoints,
      markdown,
    });
  });
