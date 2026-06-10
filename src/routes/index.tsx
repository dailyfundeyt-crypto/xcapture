import { createFileRoute } from "@tanstack/react-router";
import { Download, Chrome, FileDown, Zap, Shield, Github } from "lucide-react";
import logoAsset from "@/assets/xcapture-logo.png.asset.json";

const GITHUB_URL = "https://github.com/dailyfundeyt-crypto/X-Article-Extension";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XCapture — Save X articles to Obsidian in one click" },
      {
        name: "description",
        content:
          "XCapture is a free, open-source Chrome extension that saves any X (Twitter) post or article as a clean Obsidian-ready Markdown package with images.",
      },
      { property: "og:title", content: "XCapture — Save X articles to Obsidian" },
      {
        property: "og:description",
        content:
          "Free, open-source Chrome extension. Save any X post as Markdown + images, ready for Obsidian.",
      },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
    ],
  }),
  component: Index,
});

function Index() {
  const handleDownload = () => {
    fetch("/xcapture.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "xcapture.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-white/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-white/[0.04] blur-3xl" />

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="XCapture logo"
            className="h-8 w-8 object-contain invert"
          />
          <span className="text-sm font-semibold tracking-tight">XCapture</span>
        </div>
        <nav className="flex items-center gap-5">
          <a
            href="#install"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Install guide
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <Chrome className="h-3.5 w-3.5" />
            Chrome Extension · Open Source · v1.0
          </div>

          <div className="mt-10 flex justify-center">
            <img
              src={logoAsset.url}
              alt="XCapture"
              className="h-28 w-28 object-contain invert drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            />
          </div>

          <h1 className="mt-8 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
            Save any{" "}
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              X article
            </span>
            <br />
            straight to Obsidian.
          </h1>

          <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto">
            XCapture turns any X post or thread into a clean Markdown file with
            all images bundled — ready to drop into your Obsidian vault.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black hover:bg-white/90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              <Download className="h-4 w-4" />
              Download XCapture
            </button>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors backdrop-blur"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>

          <p className="mt-4 text-xs text-white/40">
            Free & open source · Chrome, Edge, Brave, Arc
          </p>
        </div>

        {/* Features */}
        <div className="mt-32 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "One-click capture",
              desc: "Grab any X post, thread, or article without leaving the page.",
            },
            {
              icon: FileDown,
              title: "Obsidian-ready",
              desc: "Exports a Markdown file plus an images folder — drop straight into your vault.",
            },
            {
              icon: Shield,
              title: "Private & open",
              desc: "Runs locally in your browser. 100% open source on GitHub.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm hover:bg-white/[0.05] transition-colors"
            >
              <f.icon className="h-5 w-5 text-white/80" />
              <h3 className="mt-4 text-base font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Install */}
        <section
          id="install"
          className="mt-32 rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-12 backdrop-blur-sm"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Install in 30 seconds
          </h2>
          <ol className="mt-8 space-y-5">
            {[
              "Download the ZIP and unzip it on your computer.",
              "Open chrome://extensions in your browser.",
              "Enable Developer mode in the top-right corner.",
              "Click Load unpacked and select the unzipped folder.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-medium text-white/80">
                  {i + 1}
                </span>
                <span className="text-white/75 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition-all"
            >
              <Download className="h-4 w-4" />
              Download .zip
            </button>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <Github className="h-4 w-4" />
              Source code
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} XCapture · Open source on{" "}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white/70"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
