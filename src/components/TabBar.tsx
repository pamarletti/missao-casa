"use client";

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={
            "text-sm px-4 py-2 rounded-full whitespace-nowrap transition " +
            (active === t.key ? "bg-casa-accent text-slate-900 font-semibold" : "bg-slate-700 text-slate-300")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
