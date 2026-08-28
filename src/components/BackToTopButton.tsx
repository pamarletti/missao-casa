"use client";

export default function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-casa-accent text-slate-900 shadow-lg flex items-center justify-center text-2xl font-bold hover:opacity-90"
    >
      ↑
    </button>
  );
}
