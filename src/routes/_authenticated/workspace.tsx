import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowLeft,
  FilePlus2,
  FolderPlus,
  Loader2,
  Save,
  Send,
  Sparkles,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
} from "lucide-react";
import {
  listVaultFiles,
  getVaultFile,
  upsertVaultFile,
  deleteVaultFile,
} from "@/lib/api/vault.functions";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [{ title: "Workspace · XCapture" }] }),
  component: WorkspacePage,
});

type FileRow = { id: string; path: string; is_folder: boolean; updated_at: string };

type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
};

function buildTree(files: FileRow[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };
  const folders = new Map<string, TreeNode>();
  folders.set("", root);

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  for (const f of sorted) {
    const parts = f.path.split("/").filter(Boolean);
    let parentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      const isFolder = isLast ? f.is_folder : true;
      let node = folders.get(path);
      if (!node) {
        node = { name, path, isFolder, children: [] };
        folders.set(path, node);
        folders.get(parentPath)!.children.push(node);
      }
      parentPath = path;
    }
  }
  return root;
}

function WorkspacePage() {
  const list = useServerFn(listVaultFiles);
  const getFile = useServerFn(getVaultFile);
  const upsert = useServerFn(upsertVaultFile);
  const del = useServerFn(deleteVaultFile);

  const [files, setFiles] = useState<FileRow[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"edit" | "split" | "preview">("split");
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));

  const refresh = async () => {
    const rows = (await list()) as FileRow[];
    setFiles(rows);
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  // seed welcome note on first visit
  useEffect(() => {
    (async () => {
      const rows = (await list()) as FileRow[];
      if (rows.length === 0) {
        await upsert({
          data: {
            path: "Welcome.md",
            content:
              "# Welcome to your Viewer Vault\n\nThis is your personal markdown space. Talk to the AI on the left — it can read this note and help you write.\n\n- Create notes with the **+ Note** button.\n- Organize them with folders (use `/` in the path).\n- Everything is saved to the cloud and reachable from anywhere.",
            is_folder: false,
          },
        });
        await refresh();
        setActivePath("Welcome.md");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activePath) return;
    (async () => {
      const row = await getFile({ data: { path: activePath } });
      setContent(row?.content ?? "");
      setDirty(false);
    })();
  }, [activePath, getFile]);

  const tree = useMemo(() => buildTree(files), [files]);

  const save = async () => {
    if (!activePath) return;
    setSaving(true);
    try {
      await upsert({ data: { path: activePath, content, is_folder: false } });
      setDirty(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  // auto-save 1.5s after typing stops
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || !activePath) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save().catch(console.error);
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dirty, activePath]);

  const onNewNote = async () => {
    const name = prompt("Note path (e.g. Ideas/My note.md)");
    if (!name) return;
    const path = name.endsWith(".md") ? name : `${name}.md`;
    await upsert({ data: { path, content: `# ${path.split("/").pop()?.replace(/\.md$/, "")}\n\n`, is_folder: false } });
    await refresh();
    setActivePath(path);
  };

  const onNewFolder = async () => {
    const name = prompt("Folder path (e.g. Projects/Research)");
    if (!name) return;
    await upsert({ data: { path: name, content: "", is_folder: true } });
    await refresh();
    setExpanded((s) => new Set([...s, name]));
  };

  const onDelete = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    await del({ data: { path } });
    await refresh();
    if (activePath === path) {
      setActivePath(null);
      setContent("");
    }
  };

  const toggleExpand = (p: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  // Chat
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: (async () => {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        }) as unknown as () => Record<string, string>,
      }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  // Refresh vault whenever the AI writes a note via the write_note tool
  useEffect(() => {
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    let wrotePath: string | null = null;
    for (const p of last.parts as Array<{ type: string; output?: unknown }>) {
      if (p.type === "tool-write_note" && p.output) {
        const out = p.output as { ok?: boolean; path?: string };
        if (out.ok && out.path) {
          wrotePath = out.path;
          break;
        }
      }
    }
    if (wrotePath) {
      refresh().catch(console.error);
      setActivePath(wrotePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages]);



  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(
      { text },
      {
        body: {
          context: {
            currentNote: activePath ? { path: activePath, content } : null,
          },
        },
      },
    );
  };

  const saveLastAssistantAsNote = async () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    const text = lastAssistant.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("\n");
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const baseName = (titleMatch?.[1] ?? "Chat note").replace(/[^\w\s-]/g, "").trim().slice(0, 60);
    const path = `Chat/${baseName || "Note"}-${Date.now()}.md`;
    await upsert({ data: { path, content: text, is_folder: false } });
    await refresh();
    setActivePath(path);
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-sm font-medium">Workspace</span>
        </div>
        <div className="text-xs text-white/40">
          {saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[minmax(360px,40%)_1fr] overflow-hidden">
        {/* Chat */}
        <div className="border-r border-white/10 flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-white/60" /> AI Chat
            </div>
            {messages.some((m) => m.role === "assistant") && (
              <button
                onClick={saveLastAssistantAsNote}
                className="text-[11px] text-white/50 hover:text-white inline-flex items-center gap-1"
              >
                <Save className="h-3 w-3" /> Save reply as note
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-white/40">
                Ask anything about your notes. The AI sees the note open on the right.
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-white text-black ml-8"
                      : "bg-white/[0.06] border border-white/10 mr-8 whitespace-pre-wrap"
                  }`}
                >
                  {text}
                </div>
              );
            })}
            {isBusy && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={2}
                placeholder="Message your vault…"
                className="flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
              <button
                onClick={onSend}
                disabled={isBusy || !input.trim()}
                className="rounded-xl bg-white p-2.5 text-black disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Vault */}
        <div className="grid grid-cols-[240px_1fr] overflow-hidden">
          {/* Tree */}
          <div className="border-r border-white/10 flex flex-col">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/40">Vault</span>
              <div className="flex items-center gap-1">
                <button onClick={onNewNote} title="New note" className="text-white/50 hover:text-white">
                  <FilePlus2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={onNewFolder} title="New folder" className="text-white/50 hover:text-white">
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1 text-sm">
              <TreeView
                node={tree}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpand}
                activePath={activePath}
                onSelect={(n) => !n.isFolder && setActivePath(n.path)}
                onDelete={onDelete}
              />
            </div>
          </div>

          {/* Editor */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="text-sm text-white/70 truncate">{activePath ?? "No file selected"}</div>
              <div className="flex items-center gap-1">
                {(["edit", "split", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-2 py-1 text-[11px] ${
                      view === v ? "bg-white text-black" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
                <button
                  onClick={save}
                  disabled={!dirty || !activePath || saving}
                  className="ml-2 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
            </div>
            {!activePath ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                Select or create a note on the left.
              </div>
            ) : (
              <div className={`flex-1 grid overflow-hidden ${view === "split" ? "grid-cols-2" : "grid-cols-1"}`}>
                {(view === "edit" || view === "split") && (
                  <textarea
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setDirty(true);
                    }}
                    className="h-full w-full resize-none border-r border-white/10 bg-black p-4 font-mono text-sm outline-none"
                    spellCheck={false}
                  />
                )}
                {(view === "preview" || view === "split") && (
                  <div className="h-full overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
                    <MarkdownPreview source={content} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeView({
  node,
  depth,
  expanded,
  onToggle,
  activePath,
  onSelect,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (p: string) => void;
  activePath: string | null;
  onSelect: (n: TreeNode) => void;
  onDelete: (p: string) => void;
}) {
  if (depth === 0) {
    return (
      <>
        {node.children.map((c) => (
          <TreeView
            key={c.path}
            node={c}
            depth={1}
            expanded={expanded}
            onToggle={onToggle}
            activePath={activePath}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </>
    );
  }
  const isOpen = expanded.has(node.path);
  const isActive = activePath === node.path;
  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/[0.04] ${
          isActive ? "bg-white/[0.08] text-white" : "text-white/70"
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => (node.isFolder ? onToggle(node.path) : onSelect(node))}
      >
        {node.isFolder ? (
          isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )
        ) : (
          <span className="w-3" />
        )}
        {node.isFolder ? (
          <Folder className="h-3.5 w-3.5 text-white/50" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-white/50" />
        )}
        <span className="truncate flex-1 text-[13px]">{node.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.path);
          }}
          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {node.isFolder && isOpen &&
        node.children.map((c) => (
          <TreeView
            key={c.path}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            activePath={activePath}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

// Minimal markdown -> HTML preview (headers, bold, italic, code, lists, links)
function MarkdownPreview({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function renderMarkdown(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    const h = raw.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = raw.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (raw.trim() === "") {
      closeList();
      out.push("");
      continue;
    }
    closeList();
    out.push(`<p>${inline(raw)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function inline(s: string): string {
  let r = escapeHtml(s);
  r = r.replace(/`([^`]+)`/g, "<code>$1</code>");
  r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  r = r.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return r;
}
