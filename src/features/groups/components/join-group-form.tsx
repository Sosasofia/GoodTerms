"use client";

import { useState } from "react";
import { joinGroup } from "@/lib/api";

interface JoinGroupFormProps {
  onClose: () => void;
  onJoined: (groupId: string) => void;
}

export function JoinGroupForm({ onClose, onJoined }: JoinGroupFormProps) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Group code is required.");
      return;
    }
    if (!memberName.trim()) {
      setError("Member name is required.");
      return;
    }

    setLoading(true);
    try {
      const group = await joinGroup({
        code: code.trim().toUpperCase(),
        pin: pin.trim() || undefined,
        memberName: memberName.trim(),
      });
      if (!group?.id) {
        throw new Error("Failed to join group.");
      }
      onJoined(group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-xl font-bold">Join Group</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            GROUP CODE
          </label>
          <input
            autoFocus
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC-123"
            className="w-full rounded border p-2 font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
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
            placeholder="Leave blank if none"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            MEMBER NAME
          </label>
          <input
            required
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Name added by the manager"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Use the name the manager added to the group.
          </p>
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
            className="flex-1 rounded bg-green-600 py-2 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Joining..." : "Join"}
          </button>
        </div>
      </form>
    </>
  );
}
