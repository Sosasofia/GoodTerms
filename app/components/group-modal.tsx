"use client";

import { useState } from "react";
import { createGroup, joinGroup } from "../lib/api";

interface GroupModalProps {
    mode: "create" | "join";
    onClose: () => void;
    onSuccess: () => void;
}

export function GroupModal({ mode, onClose, onSuccess }: GroupModalProps) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (mode === "create") {
                await createGroup(name);
            } else {
                await joinGroup(code);
            }
            onSuccess();
        } catch (err) {
            alert("Error: " + err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                <h2 className="text-xl font-bold mb-4">{mode === "create" ? "Create Group" : "Join Group"}</h2>
                <form onSubmit={handleSubmit}>
                    {mode === "create" ? (
                        <input className="w-full border p-2 rounded mb-4" placeholder="Group Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    ) : (
                        <input className="w-full border p-2 rounded mb-4" placeholder="Enter Code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-200 rounded">Cancel</button>
                        <button className={`flex-1 py-2 rounded text-white font-bold ${mode === "create" ? "bg-blue-600" : "bg-green-600"}`}>
                            {mode === "create" ? "Create" : "Join"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
