import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Link as LinkIcon,
  FileText,
  Download,
  Copy,
  Check,
  Key,
  Loader2,
  ExternalLink,
  CloudUpload,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { captureArticle } from "@/lib/api/capture.functions";
import { saveArticle } from "@/lib/api/articles.functions";
import { classifyArticle } from "@/lib/api/vault.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

type CaptureResult = {
  title: string;
  summary: string;
  tags: string[];
  keyPoints: string[];
  markdown: string;
};

const LS_KEY = "xcapture.byok";

type Byok = {
  enabled: boolean;
  baseURL: string;
  apiKey: string;
  model: string;
};

function loadByok(): Byok {
  if (typeof window === "undefined")
    return { enabled: false, baseURL: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o-mini" };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { enabled: false, baseURL: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o-mini" };
}

async function callOwnAi(byok: Byok, source: string, kind: "url" | "text"): Promise<CaptureResult> {
  let content = source;
  if (kind === "url") {
    // fetch via a public reader proxy to avoid CORS
    const proxyUrl = `https://r.jina.ai/${source}`;
    const r = await fetch(proxyUrl);
    if (!r.ok) throw new Error(`Could not fetch URL (${r.status})`);
    content = (await r.text()).slice(0, 30000);
  }
  const system =
    "You convert articles or X posts into clean Obsidian-ready Markdown. Answer ONLY with valid JSON matching the schema {title, summary, tags[], keyPoints[], markdownBody}. Use the source language.";
  const user = `Source${kind === "url" ? ` URL: ${source}` : ""}:\n\n${content}\n\nReturn JSON: { "title": string, "summary": string (2-4 sentences), "tags": string[] (3-8, lowercase, dashes), "keyPoints": string[] (3-7), "markdownBody": string (with ## Summary, ## Key points, ## Notes sections, no frontmatter) }`;

  const res = await fetch(`${byok.baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${byok.apiKey}`,
    },
    body: JSON.stringify({
      model: byok.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI request failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text);
  const frontmatter = [
    "---",
    `title: "${String(parsed.title || "Untitled").replace(/"/g, '\\"')}"`,
    kind === "url" ? `source: ${source}` : null,
    `captured: ${new Date().toISOString()}`,
    `tags: [${(parsed.tags || []).map((t: string) => `"${t}"`).join(", ")}]`,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    title: parsed.title || "Untitled",
    summary: parsed.summary || "",
    tags: parsed.tags || [],
    keyPoints: parsed.keyPoints || [],
    markdown: `${frontmatter}# ${parsed.title || "Untitled"}\n\n${parsed.markdownBody || ""}\n`,
  };
}

export function AICapture() {
  const capture = useServerFn(captureArticle);
  const save = useServerFn(saveArticle);
  const classify = useServerFn(classifyArticle);
  const [kind, setKind] = useState<"url" | "text">("url");
  const [source, setSource] = useState("");
  const [vault, setVault] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingLib, setSavingLib] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [suggestedFolder, setSuggestedFolder] = useState<string>("");
  const [folderIsNew, setFolderIsNew] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const [byok, setByok] = useState<Byok>(() => loadByok());
  const [showByok, setShowByok] = useState(false);

  const saveByok = (next: Byok) => {
    setByok(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const run = async () => {
    setError(null);
    setResult(null);
    setSuggestedFolder("");
    if (!source.trim()) {
      setError("Please paste a URL or text first.");
      return;
    }
    setLoading(true);
    try {
      const r =
        byok.enabled && byok.apiKey
          ? await callOwnAi(byok, source.trim(), kind)
          : await capture({ data: { source: source.trim(), kind } });
      setResult(r);
      if (authed) {
        // Fire-and-forget folder suggestion
        classify({ data: { title: r.title, summary: r.summary, tags: r.tags } })
          .then((c) => {
            setSuggestedFolder(c.folder);
            setFolderIsNew(c.isNew);
          })
          .catch(() => {
            /* non-fatal */
          });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const downloadMd = () => {
    if (!result) return;
    const safe = result.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "note";
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openInObsidian = () => {
    if (!result) return;
    const safe = result.title.replace(/[^\w\s-]/g, "").trim().slice(0, 80) || "Note";
    const params = new URLSearchParams();
    if (vault.trim()) params.set("vault", vault.trim());
    params.set("name", safe);
    params.set("content", result.markdown);
    window.location.href = `obsidian://new?${params.toString()}`;
  };

  const copyMd = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.section
      id="ai"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="mt-32 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-12 backdrop-blur-md"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 60px -30px rgba(0,0,0,0.7)",
      }}
    >
      <div className="flex items-center gap-2 text-xs text-white/60">
        <Sparkles className="h-3.5 w-3.5" />
        AI-Powered · Try it live
      </div>
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
        Turn any article into an Obsidian note
      </h2>
      <p className="mt-2 text-white/55 max-w-2xl">
        Paste an X-post URL, article link, or raw text. The AI summarizes it,
        adds tags, and gives you a ready-to-save Markdown note.
      </p>

      {/* Tabs */}
      <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        {([
          { v: "url", icon: LinkIcon, label: "URL" },
          { v: "text", icon: FileText, label: "Text" },
        ] as const).map((t) => (
          <button
            key={t.v}
            onClick={() => setKind(t.v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
              kind === t.v ? "bg-white text-black" : "text-white/70 hover:text-white"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mt-4">
        {kind === "url" ? (
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://x.com/username/status/..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
          />
        ) : (
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste the full article text here…"
            rows={8}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-y"
          />
        )}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <input
          value={vault}
          onChange={(e) => setVault(e.target.value)}
          placeholder="Obsidian vault name (optional, for 1-click open)"
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Generating…" : "Generate note"}
        </motion.button>
      </div>

      {/* BYOK */}
      <div className="mt-4">
        <button
          onClick={() => setShowByok((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <Key className="h-3 w-3" />
          {byok.enabled ? "Using your API key" : "Use your own API key (optional)"}
        </button>
        {showByok && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={byok.enabled}
                onChange={(e) => saveByok({ ...byok, enabled: e.target.checked })}
              />
              Enable bring-your-own-key (OpenAI-compatible)
            </label>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={byok.baseURL}
                onChange={(e) => saveByok({ ...byok, baseURL: e.target.value })}
                placeholder="Base URL"
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30"
              />
              <input
                value={byok.model}
                onChange={(e) => saveByok({ ...byok, model: e.target.value })}
                placeholder="Model (e.g. gpt-4o-mini)"
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30"
              />
              <input
                value={byok.apiKey}
                onChange={(e) => saveByok({ ...byok, apiKey: e.target.value })}
                placeholder="API key (stored locally)"
                type="password"
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30"
              />
            </div>
            <p className="text-[10px] text-white/40">
              Key stays in your browser's localStorage. Works with any OpenAI-compatible endpoint
              (OpenAI, Groq, Together, OpenRouter, local LM Studio, …).
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-white/10 bg-black/40 overflow-hidden"
        >
          <div className="border-b border-white/10 p-5">
            <h3 className="text-lg font-semibold">{result.title}</h3>
            <p className="mt-2 text-sm text-white/70">{result.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <pre className="max-h-80 overflow-auto p-5 text-xs text-white/70 font-mono whitespace-pre-wrap">
            {result.markdown}
          </pre>
          <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
            {authed ? (
              <button
                onClick={async () => {
                  if (!result) return;
                  setSavingLib(true);
                  try {
                    await save({
                      data: {
                        source_url: kind === "url" ? source.trim() : null,
                        title: result.title,
                        summary: result.summary,
                        markdown: result.markdown,
                        tags: result.tags,
                        key_points: result.keyPoints,
                      },
                    });
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSavingLib(false);
                  }
                }}
                disabled={savingLib || saved}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black disabled:opacity-70"
              >
                {savingLib ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                {saved ? "Saved to library" : "Save to library"}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                Sign in to save
              </Link>
            )}
            <button
              onClick={openInObsidian}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Obsidian
            </button>
            <button
              onClick={downloadMd}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
            <button
              onClick={copyMd}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Markdown"}
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
