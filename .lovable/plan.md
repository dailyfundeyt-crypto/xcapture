# Plan: Profilbild, Auto-Folder-KI, Workspace & Google Drive

## 1. Profilbild
- Neuer Storage Bucket `avatars` (privat, RLS pro User).
- `profiles.avatar_url` Spalte hinzufügen.
- Upload-UI in Settings: Bild auswählen → in `avatars/{user_id}/avatar.{ext}` speichern → URL ins Profil.
- Avatar wird im Header und in der neuen Workspace-Topbar angezeigt.

## 2. Auto-Folder beim Speichern
- Neue Server-Funktion `classifyArticle`: nimmt Titel + Summary + Tags, ruft Lovable AI (`google/gemini-3-flash-preview`) und gibt einen Ordnernamen zurück (aus den bisher genutzten Ordnern des Users + Vorschlag für neuen Ordner).
- Beim "Save to Library" in `AICapture` wird automatisch ein Ordner vorgeschlagen, den der User vor dem finalen Speichern noch ändern kann (Dropdown mit "Vorgeschlagen: X").

## 3. Workspace `/workspace` (neue Hauptoberfläche)
Geteilte Ansicht (resizable, Standard 40/60):
- **Links — Chat mit KI**
  - Streaming-Chat über `/api/chat` (AI SDK + Lovable AI).
  - Hat Kontext aller gespeicherten Artikel und der aktuell geöffneten Note rechts.
  - "Save this as note" Button → erzeugt Markdown-Datei im Vault.
- **Rechts — Vault-Editor (Obsidian-Ersatz "Viewer")**
  - Ordnerbaum links innen, Markdown-Editor rechts.
  - Live-Preview Toggle (Edit / Split / Preview).
  - Backed by Lovable Cloud (Tabelle `vault_files`: `path`, `content`, `user_id`) — funktioniert sofort.
  - Optional: Sync mit Google Drive.

## 4. Google Drive OAuth (per User)
Per-User OAuth (nicht Workspace-Connector). Ablauf:
- Du legst in Google Cloud Console OAuth-Credentials an (Web-App, Scope `drive.file`), gibst Client-ID/Secret als Secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Lovable Cloud ein.
- Neue Server-Routes:
  - `GET /api/google/connect` → leitet zu Google OAuth.
  - `GET /api/google/callback` → tauscht Code gegen Tokens, speichert verschlüsselt in `google_connections` Tabelle (user_id, refresh_token, access_token, expiry).
- "Connect Google Drive" Button in Settings.
- Vault-Editor zeigt zusätzliches Toggle "Sync to Drive folder XCapture/" — beim Speichern wird die Datei zusätzlich nach Google Drive geschrieben (`files.create` via Connector-Gateway-Style fetch mit user-token).

## Reihenfolge der Implementierung
1. Migration: `vault_files`, `google_connections`, `profiles.avatar_url`; Storage Bucket `avatars` + Policies.
2. Profilbild-Upload in Settings.
3. `classifyArticle` Server-Fn + Integration in AICapture-Save.
4. `/workspace` Route: Chat + Vault-Editor (Lovable Cloud Storage).
5. Google OAuth Routes + Connect-Button + Drive-Sync.

## Hinweis
Google Drive per-User OAuth braucht ein **einmaliges Setup deinerseits in Google Cloud Console** (ca. 5 Min). Ich erkläre dir Schritt für Schritt was du dort klicken musst, sobald wir bei Schritt 5 sind.

Soll ich starten?
