import { createFileRoute } from "@tanstack/react-router";
import { Download, Chrome, FileDown, Zap, Shield, Github, Copy, Check } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import logoAsset from "@/assets/xcapture-logo.png.asset.json";
import { TiltLogo } from "@/components/TiltLogo";

const ThreeBackground = lazy(() =>
  import("@/components/ThreeBackground").then((m) => ({
    default: m.ThreeBackground,
  })),
);

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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={onCopy}
      className="mx-1 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-xs text-white hover:bg-white/20 transition-colors align-baseline"
      title="Copy to clipboard"
    >
      <span>{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-400" />
      ) : (
        <Copy className="h-3 w-3 text-white/60" />
      )}
    </button>
  );
}

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      {/* 3D Three.js background */}
      {mounted && (
        <Suspense fallback={null}>
          <ThreeBackground />
        </Suspense>
      )}

      {/* Vignette + grid overlay above 3D */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_70%,#000_100%)]" />

      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
      >
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
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-32">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur"
          >
            <Chrome className="h-3.5 w-3.5" />
            Chrome Extension · Open Source · v1.0
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-10 flex justify-center"
          >
            <TiltLogo
              src={logoAsset.url}
              alt="XCapture"
              className="h-64 w-64 sm:h-80 sm:w-80"
            />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-8 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]"
          >
            Save any{" "}
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              X article
            </span>
            <br />
            straight to Obsidian.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-6 text-lg text-white/60 max-w-xl mx-auto"
          >
            XCapture turns any X post or thread into a clean Markdown file with
            all images bundled — ready to drop into your Obsidian vault.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownload}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <Download className="h-4 w-4" />
              Download XCapture
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors backdrop-blur"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </motion.a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-4 text-xs text-white/40"
          >
            Free & open source · Chrome, Edge, Brave, Arc
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-32 grid gap-4 sm:grid-cols-3"
        >
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
            <motion.div
              key={f.title}
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md hover:bg-white/[0.07] transition-colors"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 40px -20px rgba(0,0,0,0.6)",
              }}
            >
              <f.icon className="h-5 w-5 text-white/80" />
              <h3 className="mt-4 text-base font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Install */}
        <motion.section
          id="install"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mt-32 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-12 backdrop-blur-md"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 60px -30px rgba(0,0,0,0.7)",
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Install in 30 seconds
          </h2>
          <ol className="mt-8 space-y-5">
            {[
              { text: "Download the ZIP and unzip it on your computer." },
              {
                text: "Open ",
                copy: "chrome://extensions",
                after: " in your browser.",
              },
              { text: "Enable Developer mode in the top-right corner." },
              { text: "Click Load unpacked and select the unzipped folder." },
            ].map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex gap-4 items-start"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-medium text-white/80">
                  {i + 1}
                </span>
                <span className="text-white/75 pt-0.5">
                  {step.text}
                  {step.copy && (
                    <>
                      <CopyChip value={step.copy} />
                      {step.after}
                    </>
                  )}
                </span>
              </motion.li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
            >
              <Download className="h-4 w-4" />
              Download .zip
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <Github className="h-4 w-4" />
              Source code
            </motion.a>
          </div>
        </motion.section>
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
