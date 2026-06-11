import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · XCapture" }] }),
  component: SettingsPage,
});

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  obsidian_vault: string | null;
  default_folder: string | null;
  ai_model: string | null;
  byok_endpoint: string | null;
  byok_model: string | null;
  byok_key: string | null;
};

function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name,avatar_url,obsidian_vault,default_folder,ai_model,byok_endpoint,byok_model,byok_key",
        )
        .eq("id", u.user.id)
        .maybeSingle();
      setProfile(
        data ?? {
          display_name: "",
          avatar_url: null,
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

  useEffect(() => {
    (async () => {
      if (!profile?.avatar_url) {
        setAvatarPreview(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      setAvatarPreview(data?.signedUrl ?? null);
    })();
  }, [profile?.avatar_url]);

  const save = async () => {
    if (!profile || !userId) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...profile });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved");
    setTimeout(() => setMsg(null), 2500);
  };

  const set = <K extends keyof Profile,>(k: K, v: Profile[K]) =>
    setProfile((p) => (p ? { ...p, [k]: v } : p));

  const onPickAvatar = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await supabase.from("profiles").upsert({ id: userId, avatar_url: path });
      set("avatar_url", path);
      setMsg("Avatar updated");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  };

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
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative h-20 w-20 rounded-full overflow-hidden border border-white/15 bg-white/[0.04] flex items-center justify-center group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-white/40" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
                  </span>
                </button>
                <div className="flex-1">
                  <p className="text-xs text-white/50">Profile picture</p>
                  <p className="text-[11px] text-white/40 mt-1">PNG, JPG. Max 2 MB recommended.</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickAvatar(f);
                  }}
                />
              </div>

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
              title="Google Drive sync"
              description="Coming next step — connect Drive so your vault syncs to a folder you choose."
            >
              <button
                disabled
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/40 cursor-not-allowed"
              >
                Connect Google Drive (Setup required)
              </button>
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
