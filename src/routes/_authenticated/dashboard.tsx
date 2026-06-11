import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  LogOut,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listArticles, deleteArticle } from "@/lib/api/articles.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · XCapture" }] }),
  component: Dashboard,
});

type Row = {
  id: string;
  title: string;
  summary: string | null;
  tags: string[];
  folder: string | null;
  source_url: string | null;
  created_at: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const list = useServerFn(listArticles);
  const del = useServerFn(deleteArticle);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    list()
      .then((r) => setRows(r as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [list]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await del({ data: { id } });
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            XCapture
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/50 hidden sm:inline">{email}</span>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
            <p className="mt-1 text-white/55 text-sm">
              All articles you've captured from the web, extension, or Telegram bot.
            </p>
          </div>
          <Link
            to="/"
            hash="ai"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
          >
            <Sparkles className="h-3.5 w-3.5" /> Capture new
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {rows === null && !error && (
          <div className="mt-10 flex items-center gap-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-white/30" />
            <p className="mt-3 text-white/60">No notes yet — capture your first article.</p>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.07] transition-colors"
              >
                <h3 className="font-medium leading-snug">{r.title}</h3>
                {r.summary && (
                  <p className="mt-2 text-sm text-white/55 line-clamp-3">{r.summary}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-white/40">
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {r.source_url && (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button onClick={() => onDelete(r.id)} className="hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
