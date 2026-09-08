"use client";

import { useState } from "react";
import { createGroup } from "@/lib/api";

interface CreateGroupFormProps {
  onClose: () => void;
  onCreated: (group: { id: string; name: string; code: string }) => void;
}

export function CreateGroupForm({ onClose, onCreated }: CreateGroupFormProps) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setLoading(true);
    try {
      const group = await createGroup(name.trim(), pin.trim() || undefined);
      if (!group) {
        throw new Error("Failed to create group.");
      }
      onCreated({ id: group.id, name: group.name, code: group.code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-xl font-bold">Create New Group</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            GROUP NAME
          </label>
          <input
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Bali Trip"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            GROUP PIN (OPTIONAL)
          </label>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Leave blank for no PIN"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && (
          <div className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded bg-slate-100 py-2 font-medium text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </>
  );
}
