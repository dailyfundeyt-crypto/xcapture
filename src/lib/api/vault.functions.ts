import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";

export const listVaultFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vault_files")
      .select("id, path, is_folder, updated_at")
      .order("path");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vault_files")
      .select("id, path, content, is_folder, updated_at")
      .eq("path", data.path)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const UpsertSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(500_000).default(""),
  is_folder: z.boolean().default(false),
});

export const upsertVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vault_files")
      .upsert(
        {
          user_id: context.userId,
          path: data.path,
          content: data.content,
          is_folder: data.is_folder,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,path" },
      )
      .select("id, path, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vault_files")
      .delete()
      .eq("path", data.path);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ClassifySchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export const classifyArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClassifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    // Existing folders the user has used
    const { data: existing } = await context.supabase
      .from("articles")
      .select("folder")
      .not("folder", "is", null)
      .limit(200);
    const folders = Array.from(
      new Set((existing ?? []).map((r) => r.folder).filter(Boolean) as string[]),
    );

    const gateway = createLovableAiGatewayProvider(key);
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "You are a librarian. Pick the best folder for a new article. " +
        "Prefer an existing folder if it fits. Otherwise propose a new short, clear folder name (Title Case, max 3 words).",
      prompt:
        `Existing folders: ${folders.length ? folders.join(", ") : "(none)"}\n\n` +
        `Article title: ${data.title}\n` +
        `Summary: ${data.summary}\n` +
        `Tags: ${data.tags.join(", ")}\n\n` +
        `Return the folder name and whether it is new.`,
      experimental_output: Output.object({
        schema: z.object({
          folder: z.string().min(1).max(60),
          is_new: z.boolean(),
          reason: z.string().max(200),
        }),
      }),
    });

    return {
      folder: experimental_output.folder,
      isNew: experimental_output.is_new,
      reason: experimental_output.reason,
      existing: folders,
    };
  });
