"use client";

import { useState } from "react";
import { Group } from "../lib/types";
import { createExpense } from "../lib/api";

interface ExpenseFormProps {
    group: Group;
    onSuccess: () => void;
}

export function ExpenseForm({ group, onSuccess }: ExpenseFormProps) {
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [payerId, setPayerId] = useState(group.members[0]?.id || "");
    const [involved, setInvolved] = useState<string[]>(group.members.map(m => m.id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (involved.length === 0) return;

        try {
            await createExpense(group.id, {
                description: desc,
                amount: parseFloat(amount),
                payerId,
                splits: involved.map((memberId) => ({
                    debtorId: memberId,
                    amount: parseFloat(amount) / involved.length,
                })),
            });


            setAmount("");
            onSuccess();
        } catch (error) {
            console.error("Failed to add expense", error);
            alert("Failed to add expense");
        }
    };

    function toggleUser(userId: string) {
        if (involved.includes(userId)) setInvolved(involved.filter(id => id !== userId));
        else setInvolved([...involved, userId]);
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input className="w-full border p-3 rounded-lg" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <input className="w-full border p-3 rounded-lg" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <input className="w-full border p-3 rounded-lg" type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />

                <div>
                    <label className="text-xs font-bold text-slate-500">PAID BY</label>
                    <select className="w-full border p-2 rounded" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                        {group.members.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500">SPLIT AMONGST</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {group.members.map((u) => (
                            <label key={u.id} className="flex items-center gap-1 cursor-pointer bg-slate-50 px-2 py-1 rounded">
                                <input type="checkbox" checked={involved.includes(u.id)} onChange={() => toggleUser(u.id)} />
                                {u.name}
                            </label>
                        ))}
                    </div>
                </div>
                <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg cursor-pointer">Save Expense</button>
            </form>
        </div>
    );
}
