"use client";

import { useState } from "react";

interface GroupCreatedViewProps {
  group: { id: string; name: string; code: string };
  onOpen: () => void;
}

export function GroupCreatedView({ group, onOpen }: GroupCreatedViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
        <div className="mb-2 text-2xl">🎉</div>
        <h2 className="text-xl font-bold text-slate-800">Group ready</h2>
        <p className="mt-1 text-sm text-slate-600">{group.name} is set up.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          Share this group code
        </div>
        <div className="select-all font-mono text-2xl font-black tracking-[0.2em] text-slate-800">
          {group.code}
        </div>
      </div>
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        Members must be added by the manager before they can join.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
        >
          Open group
        </button>
      </div>
    </div>
  );
}
