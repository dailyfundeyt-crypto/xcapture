import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · XCapture" }] }),
  component: SettingsPage,
});

type Profile = {
  display_name: string | null;
  obsidian_vault: string | null;
  default_folder: string | null;
  ai_model: string | null;
  byok_endpoint: string | null;
  byok_model: string | null;
  byok_key: string | null;
};

function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,obsidian_vault,default_folder,ai_model,byok_endpoint,byok_model,byok_key")
        .eq("id", u.user.id)
        .maybeSingle();
      setProfile(
        data ?? {
          display_name: "",
          obsidian_vault: "",
          default_folder: "XCapture",
          ai_model: "google/gemini-3-flash-preview",
          byok_endpoint: "",
          byok_model: "",
          byok_key: "",
        },
      );
    })();
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id,
      ...profile,
    });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved");
    setTimeout(() => setMsg(null), 2500);
  };

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => (p ? { ...p, [k]: v } : p));

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

        {!profile ? (
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        ) : (
          <>
            <Section title="Profile">
              <Field label="Display name">
                <input
                  value={profile.display_name ?? ""}
                  onChange={(e) => set("display_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Section>

            <Section title="Obsidian" description='Used for 1-click "Open in Obsidian" links.'>
              <Field label="Vault name">
                <input
                  value={profile.obsidian_vault ?? ""}
                  onChange={(e) => set("obsidian_vault", e.target.value)}
                  placeholder="my-vault"
                  className={inputCls}
                />
              </Field>
              <Field label="Default folder">
                <input
                  value={profile.default_folder ?? ""}
                  onChange={(e) => set("default_folder", e.target.value)}
                  placeholder="XCapture"
                  className={inputCls}
                />
              </Field>
            </Section>

            <Section
              title="AI — Bring your own key (optional)"
              description="OpenAI-compatible endpoint. Leave empty to use Lovable AI (default)."
            >
              <Field label="Endpoint">
                <input
                  value={profile.byok_endpoint ?? ""}
                  onChange={(e) => set("byok_endpoint", e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className={inputCls}
                />
              </Field>
              <Field label="Model">
                <input
                  value={profile.byok_model ?? ""}
                  onChange={(e) => set("byok_model", e.target.value)}
                  placeholder="gpt-4o-mini"
                  className={inputCls}
                />
              </Field>
              <Field label="API key">
                <input
                  type="password"
                  value={profile.byok_key ?? ""}
                  onChange={(e) => set("byok_key", e.target.value)}
                  placeholder="sk-…"
                  className={inputCls}
                />
              </Field>
            </Section>

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              {msg && <span className="text-sm text-white/60">{msg}</span>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-white/50">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-white/60 space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}
