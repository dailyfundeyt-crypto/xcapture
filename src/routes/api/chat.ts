import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
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

        const note = body.context?.currentNote;
        const system =
          "You are XCapture, the user's personal knowledge assistant. " +
          "You can discuss and refine notes in their vault. " +
          "Answer concisely in the user's language. Format replies in Markdown." +
          (note
            ? `\n\nThe user is currently viewing this note (path: ${note.path}):\n\n${note.content.slice(0, 12000)}`
            : "");

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
