import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          context?: { currentNote?: { path: string; content: string } | null };
        };
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

        // Auth: build a user-scoped supabase client from the bearer token
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

        let supabase: ReturnType<typeof createClient<Database>> | null = null;
        let userId: string | null = null;
        if (token && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
          supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data } = await supabase.auth.getClaims(token);
          userId = data?.claims?.sub ?? null;
        }

        const note = body.context?.currentNote;
        const system =
          "You are XCapture, the user's personal knowledge assistant. " +
          "You help organize and write notes in their markdown vault. " +
          "When the user asks you to create, write or save a note/file, ALWAYS call the `write_note` tool with a sensible path (use `/` for folders, end with `.md`) and the full markdown content. " +
          "After the tool runs, briefly confirm in the user's language. " +
          "Answer concisely. Format replies in Markdown." +
          (note
            ? `\n\nThe user is currently viewing this note (path: ${note.path}):\n\n${note.content.slice(0, 12000)}`
            : "");

        const tools = {
          write_note: tool({
            description:
              "Create or overwrite a markdown note in the user's vault. Use a path like 'Folder/Subfolder/Title.md'. Existing notes at the same path are overwritten.",
            inputSchema: z.object({
              path: z
                .string()
                .min(1)
                .describe("Vault path ending with .md, e.g. 'Ideas/Prompting.md'"),
              content: z.string().describe("Full markdown body of the note."),
            }),
            execute: async ({ path, content }) => {
              if (!supabase || !userId) {
                return { ok: false, error: "Not authenticated" };
              }
              const cleanPath = path.endsWith(".md") ? path : `${path}.md`;
              const { error } = await supabase
                .from("vault_files")
                .upsert(
                  {
                    user_id: userId,
                    path: cleanPath,
                    content,
                    is_folder: false,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,path" },
                );
              if (error) return { ok: false, error: error.message };
              return { ok: true, path: cleanPath };
            },
          }),
        };

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          tools,
          stopWhen: stepCountIs(5),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
