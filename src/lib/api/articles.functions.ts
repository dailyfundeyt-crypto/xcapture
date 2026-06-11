import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SaveSchema = z.object({
  source_url: z.string().nullable().optional(),
  title: z.string().min(1).max(300),
  summary: z.string().max(2000).optional().default(""),
  markdown: z.string().min(1).max(200_000),
  tags: z.array(z.string()).max(20).default([]),
  key_points: z.array(z.string()).max(20).default([]),
  folder: z.string().max(200).nullable().optional(),
});

export const saveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("articles")
      .insert({
        user_id: context.userId,
        source_url: data.source_url ?? null,
        title: data.title,
        summary: data.summary ?? "",
        markdown: data.markdown,
        tags: data.tags,
        key_points: data.key_points,
        folder: data.folder ?? null,
      })
      .select("id, title, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select("id, title, summary, tags, folder, source_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
