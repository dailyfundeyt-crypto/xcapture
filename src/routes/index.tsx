import { createFileRoute } from "@tanstack/react-router";
import { Download, Chrome, FileDown, Zap, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "X Article Downloader — Chrome Extension" },
      {
        name: "description",
        content:
          "Download articles and threads from X (Twitter) with one click. Free Chrome extension.",
      },
      { property: "og:title", content: "X Article Downloader — Chrome Extension" },
      {
        property: "og:description",
        content:
          "Download articles and threads from X (Twitter) with one click. Free Chrome extension.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const handleDownload = () => {
    fetch("/x-article-downloader.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "x-article-downloader.zip";
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-black font-bold">
            𝕏
          </div>
          <span className="text-sm font-medium tracking-tight">
            Article Downloader
          </span>
        </div>
        <a
          href="#install"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Install guide
        </a>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <Chrome className="h-3.5 w-3.5" />
            Chrome Extension · v1.0
          </div>

          <h1 className="mt-8 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
            Save any{" "}
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              X article
            </span>
            <br />
            in one click.
          </h1>

          <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto">
            Download long-form posts, threads, and articles from X as clean,
            readable files. No accounts. No tracking.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black hover:bg-white/90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              <Download className="h-4 w-4" />
              Download Extension
            </button>
            <a
              href="#install"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors backdrop-blur"
            >
              How to install
            </a>
          </div>

          <p className="mt-4 text-xs text-white/40">
            Free · Works on Chrome, Edge, Brave, Arc
          </p>
        </div>

        {/* Features */}
        <div className="mt-32 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Instant capture",
              desc: "One click on any X post saves the full article locally.",
            },
            {
              icon: FileDown,
              title: "Clean formats",
              desc: "Export as Markdown, plain text, or PDF — ready to read.",
            },
            {
              icon: Shield,
              title: "Private by default",
              desc: "Runs locally in your browser. Nothing leaves your device.",
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

          <button
            onClick={handleDownload}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition-all"
          >
            <Download className="h-4 w-4" />
            Download .zip
          </button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} X Article Downloader
      </footer>
    </div>
  );
}
