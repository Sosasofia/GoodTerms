"use client";

import { useEffect, useState } from "react";
import { createGroup, joinGroup } from "../lib/api";
import { useUser } from "@clerk/nextjs";
import { getOrCreateGuestId } from "../lib/identity";

interface GroupModalProps {
  mode: "create" | "join";
  onClose: () => void;
  onSuccess: () => void;
}

export function GroupModal({ mode, onClose, onSuccess }: GroupModalProps) {
  const { user, isLoaded } = useUser();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [pin, setPin] = useState("");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conflictError, setConflictError] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      const savedName = localStorage.getItem("guest_name");
      if (savedName) setGuestName(savedName);
    }
  }, [isLoaded, user]);

  const handleSubmit = async (e?: React.FormEvent, forceAction?: "claim") => {
    if (e) e.preventDefault();
    setError("");
    setConflictError(false);
    setLoading(true);

    try {
      if (mode === "create") {
        if (!user) throw new Error("You must be logged in to create a group.");
        await createGroup(name, pin);
      } else {
        let payload: any = {
          code,
          pin,
          action: forceAction || "join",
        };

        if (!user) {
          if (!guestName) throw new Error("Please enter your name.");

          localStorage.setItem("guest_name", guestName);

          const guestId = getOrCreateGuestId();
          payload.guestName = guestName;
          payload.guestId = guestId;
        }

        try {
          await joinGroup(payload);
        } catch (err: any) {
          if (err.requiresConfirmation) {
            setConflictError(true);
            setLoading(false);
            return;
          }
          throw err;
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit");
    } finally {
      if (!conflictError) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
        {!conflictError && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}

        <h2 className="text-xl font-bold mb-4">
          {mode === "create" ? "Create New Group" : "Join Group"}
        </h2>

        {conflictError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-yellow-800 text-sm mb-2">
              Is this you?
            </h3>
            <p className="text-sm text-yellow-700 mb-4">
              The name <strong>&quot;{guestName}&quot;</strong> is already in
              this group. Do you want to log in as this user?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(undefined, "claim")}
                className="flex-1 bg-yellow-500 text-white py-2 rounded font-bold hover:bg-yellow-600 transition-colors"
              >
                Yes, it&apos;s me
              </button>
              <button
                onClick={() => {
                  setConflictError(false);
                  setGuestName("");
                }}
                className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded font-bold hover:bg-slate-50 transition-colors"
              >
                No, use new name
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
              {mode === "create" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    GROUP NAME
                  </label>
                  <input
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Bali Trip"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <label className="block mt-2 text-xs font-bold text-slate-500 mb-1">
                    GROUP PIN (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 1234 (Leave blank for no PIN)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
              )}

              {mode === "join" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    INVITE CODE
                  </label>
                  <input
                    className="w-full border p-2 rounded uppercase font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ABC-123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
              )}

              {mode === "join" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    GROUP PIN (If applicable)
                  </label>
                  <input
                    type="password"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="****"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
              )}

              {mode === "join" && !user && isLoaded && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <label className="block text-xs font-bold text-yellow-700 mb-1">
                    YOUR NAME (Guest Mode)
                  </label>
                  <input
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                    placeholder="Your Nickname"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <p className="text-[10px] text-yellow-600 mt-1">
                    You are joining as a guest. We&apos;ll remember you on this
                    browser.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 rounded text-white font-bold transition-colors ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : mode === "create"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading
                    ? "Processing..."
                    : mode === "create"
                      ? "Create"
                      : "Join"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
