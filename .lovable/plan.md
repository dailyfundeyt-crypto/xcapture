## Ziel

1. Nutzer meldet sich auf xcapture.lovable.app an (E-Mail/Passwort + Google).
2. Die Chrome-Extension nutzt **dieselben** Login-Daten → eigene Einstellungen & gespeicherte Artikel werden synchronisiert.
3. Telegram-Bot, der pro Nutzer alle gespeicherten Artikel kennt, neue automatisch in den richtigen Obsidian-Ordner einsortiert und im Chat Fragen dazu beantwortet.

## Architektur

```text
 Chrome Extension ──┐
                    ├──► Lovable Cloud (Supabase)
 Web App  ──────────┤      ├─ auth.users         (gemeinsamer Login)
                    │      ├─ profiles           (Vault-Pfad, Default-Folder, AI-Settings)
                    │      ├─ articles           (URL, Markdown, Tags, Folder, captured_at)
                    │      ├─ telegram_links     (user_id ↔ telegram_chat_id, Pairing-Token)
                    │      └─ telegram_messages  (Chat-Verlauf je Nutzer)
                    │
 Telegram Bot ──────┘──► /api/public/telegram/webhook  (TanStack server route)
                            └─ AI Agent (Lovable AI, Gemini 3 Flash)
                                ├─ Tool: list_articles / search_articles
                                ├─ Tool: file_article(article_id, folder)
                                └─ Tool: summarize / answer_questions
```

## Phase 1 — Lovable Cloud + Auth (heute)

- Lovable Cloud aktivieren (Supabase im Hintergrund).
- DB-Migration:
  - `profiles` (id=auth.uid, display_name, obsidian_vault, default_folder, ai_model, byok_endpoint, byok_key_enc).
  - `articles` (id, user_id, source_url, title, markdown, tags[], folder, summary, created_at).
  - `user_roles` + `has_role()` (Standard-Pattern für später).
  - RLS: alles `auth.uid() = user_id`.
- Auth-Seite `/auth` mit E-Mail/Passwort + Google (über Lovable-Broker).
- Geschützter `/dashboard` mit:
  - Liste der gespeicherten Artikel
  - Profil-Settings (Vault-Name, Default-Folder, AI-Settings — BYOK aus Phase 0 wandert hierher)
- Bestehende `AICapture`-Demo speichert ab jetzt für eingeloggte Nutzer direkt in `articles`.

## Phase 2 — Extension-Sync

- Extension bekommt Login-Screen (in popup.html). Verwendet `@supabase/supabase-js` mit derselben URL + Publishable Key wie die Website → identische Session.
- Nach Login: pollt/lädt `profiles` + speichert Captures via PostgREST direkt in `articles`.
- Code dafür generiere ich hier; du pushst ihn ins GitHub-Repo `X-Article-Extension`. Auf der Website biete ich Download des neuen ZIPs an.

## Phase 3 — Telegram-Agent

- Telegram-Connector verbinden (Bot bei BotFather erstellt der Nutzer einmalig, Token kommt in Connector — kein manuelles Hantieren).
- DB: `telegram_links(user_id, chat_id, pairing_token, paired_at)`.
- Dashboard zeigt Button **„Mit Telegram verbinden"** → erzeugt 6-stelligen Code → User schickt `/start <code>` an den Bot → Verknüpfung gespeichert.
- Webhook `src/routes/api/public/telegram/webhook.ts`:
  - Verifiziert `X-Telegram-Bot-Api-Secret-Token`.
  - Lädt `user_id` aus `telegram_links`.
  - Lädt Artikelliste des Nutzers + Chat-Historie.
  - Ruft Lovable AI (Gemini 3 Flash) mit Tools auf:
    - `list_articles(limit, since)` 
    - `search_articles(query)`
    - `move_article_to_folder(id, folder)`
    - `summarize_article(id)`
  - Antwort zurück an Telegram.
- Auto-Filing: wenn ein neuer Artikel gespeichert wird, schickt der Server eine Benachrichtigung mit AI-Vorschlag für den Ordner; Nutzer bestätigt per Button (Inline-Keyboard).

## Was du am Ende hast

- 1 Login für Web + Extension.
- Alle Captures landen in einer zentralen Bibliothek pro Nutzer.
- Telegram-Chat: „Was hab ich diese Woche zu KI gespeichert?", „Verschieb den letzten Artikel nach /Marketing", „Fass den X-Thread von gestern zusammen".

## Technische Hinweise (intern)

- Schemas mit `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated` + RLS-Policies via `auth.uid()`.
- BYOK-Key in `profiles.byok_key_enc` mit `pgcrypto` (`pgp_sym_encrypt` + Server-Secret) — niemals Klartext im Frontend lesbar.
- Telegram-Webhook unter `/api/public/telegram/webhook`, Secret-Token = `sha256("telegram-webhook:" + TELEGRAM_API_KEY)`.
- AI-Tool-Loop: `generateText` mit `tools` + `stopWhen: stepCountIs(50)`.

## Nächster Schritt

Wenn du den Plan absegnest, fange ich mit **Phase 1** an (Cloud + Auth + DB + Dashboard). Phase 2 und 3 mache ich danach in jeweils einem eigenen Schritt — das ist sauberer als alles auf einmal zu schippen.